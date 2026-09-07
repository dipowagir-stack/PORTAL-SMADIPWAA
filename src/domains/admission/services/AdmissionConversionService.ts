import { getAllUserPermissions } from '../../../lib/rbac';
import { applicantService } from './ApplicantService';
import { admissionAuditService } from './AdmissionAuditService';
import { enqueueNotification } from '../../notification/services';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ApplicantStatus } from '../entities/Applicant';
import { upsertAcademicProfile } from '../../student/services';
import { usersService } from '../../academic/services';
import { ParentService } from '../../parent/services/ParentService';

class AdmissionConversionService {
  async convertApplicantToStudent(applicantId: string, actorId: string): Promise<Result<string>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:enroll') && actorId !== 'super_admin') {
      // Fallback check if user is super admin in users collection
      const actorUserRes = await usersService.getByIdResult(actorId);
      if (actorUserRes.isFailure || actorUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk mengkonversi siswa.');
      }
    }

    const appRes = await applicantService.getById(applicantId);
    if (!appRes) return fail(ErrorCodes.NOT_FOUND);

    // 2. Conversion Eligibility
    if (appRes.status !== ApplicantStatus.ENROLLED && appRes.status !== ApplicantStatus.SELECTED) {
      return fail('Hanya pendaftar dengan status SELECTED atau ENROLLED yang dapat dikonversi.');
    }
    if (appRes.reRegistrationStatus !== 'COMPLETED') {
      return fail('Pendaftar belum menyelesaikan daftar ulang.');
    }

    const studentUserId = appRes.createdBy;
    if (!studentUserId) return fail('Pendaftar tidak memiliki akun (createdBy tidak valid).');

    // Fetch existing user
    const userRes = await usersService.getByIdResult(studentUserId);
    if (userRes.isFailure) return fail('Akun pengguna pendaftar tidak ditemukan.');
    const userData = userRes.getValue()!;

    // 3. Duplication Protection
    if (userData.conversionCompleted) {
       return fail('Pendaftar ini sudah dikonversi menjadi siswa aktif sebelumnya.');
    }

    await admissionAuditService.log(
      applicantId, 
      'CONVERSION_STARTED', 
      actorId, 
      `Memulai proses konversi untuk calon siswa ${appRes.fullName}`
    );

    // 4. Update user profile to student (idempotent, we do NOT set conversionCompleted yet)
    const nis = appRes.registrationNumber || '';
    const nisn = appRes.nationalId || '';

    const roleUpdateRes = await usersService.updateResult(studentUserId, {
      role: 'student',
      nisn: nisn,
      updatedAt: Date.now()
    });
    
    if (roleUpdateRes.isFailure) {
       await admissionAuditService.log(applicantId, 'CONVERSION_FAILED', actorId, `Gagal mengupdate role user`);
       return fail('Gagal memperbarui profil pengguna.');
    }

    // 5. Create/Upsert Academic Profile (idempotent)
    const academicRes = await upsertAcademicProfile(studentUserId, {
      fullName: appRes.fullName,
      nis,
      nisn,
      status: 'active',
      entryYear: appRes.academicYear,
    });
    
    if (academicRes.isFailure) {
       await admissionAuditService.log(applicantId, 'CONVERSION_FAILED', actorId, `Gagal membuat profil akademik siswa`);
       return fail('Gagal membuat profil akademik siswa.');
    }

    // 6 & 7. Parent Relationship (Idempotent)
    let parentLinked = false;
    let parentId: string | null = null; // ID of the parent profile
    
    // Check if waParentNumber is provided in user profile
    if (userData.waParentNumber) {
      const parentProfileRes = await ParentService.getParentProfileByPhoneNumber(userData.waParentNumber);
      if (parentProfileRes.isSuccess) {
        parentId = parentProfileRes.getValue()!.id!;
      }
    }

    if (parentId) {
      const linkRes = await ParentService.linkStudent({
        parentId: parentId,
        studentId: studentUserId,
        relationRole: 'Guardian', // Changed from 'parent' to a valid RelationRole
        isPrimary: true,
      });
      if (linkRes.isSuccess) {
        parentLinked = true;
      } else if (linkRes.isFailure && linkRes.getError() !== ErrorCodes.VALIDATION_ERROR) {
        // If it's a validation error, it means the link already exists (from duplicate protection)
        // If it's a real error, fail the conversion.
        await admissionAuditService.log(applicantId, 'CONVERSION_FAILED', actorId, `Gagal menghubungkan data orang tua`);
        return fail('Gagal menghubungkan data orang tua.');
      } else {
        parentLinked = true; // Was already linked
      }
    }

    // Now that everything succeeded, we can safely mark it as completed
    const finalRes = await usersService.updateResult(studentUserId, {
      conversionCompleted: true,
    });

    if (finalRes.isFailure) {
       await admissionAuditService.log(applicantId, 'CONVERSION_FAILED', actorId, `Gagal meresmikan konversi`);
       return fail('Gagal meresmikan konversi. Silakan coba lagi.');
    }

    // 8. Audit Trail
    await admissionAuditService.log(
      applicantId, 
      'CONVERSION_COMPLETED', 
      actorId, 
      `Calon siswa berhasil dikonversi menjadi siswa. Parent linked: ${parentLinked}`
    );

    // 9. Notification
    await enqueueNotification({
      userId: studentUserId,
      category: 'system',
      channels: ['in_app'],
      priority: 'high',
      payload: {
        title: 'Selamat Datang di EduOS',
        body: 'Proses konversi data Anda telah selesai. Anda sekarang resmi menjadi Siswa Aktif.',
      }
    });

    if (parentId && parentLinked) {
      const parentProf = (await ParentService.getParentProfileByPhoneNumber(userData.waParentNumber!)).getValue();
      if (parentProf && parentProf.userId) {
        await enqueueNotification({
          userId: parentProf.userId, // notification needs the users.uid
          category: 'system',
          channels: ['in_app'],
          priority: 'high',
          payload: {
            title: 'Akses Orang Tua EduOS',
            body: `Data anak Anda (${appRes.fullName}) telah terhubung dengan akun Anda.`,
          }
        });
      }
    }

    return ok(studentUserId);
  }
}

export const admissionConversionService = new AdmissionConversionService();
