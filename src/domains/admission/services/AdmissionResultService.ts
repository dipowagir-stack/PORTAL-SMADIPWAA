import { getAllUserPermissions } from '../../../lib/rbac';
import { usersService } from '../../academic/services';
import { applicantService } from './ApplicantService';
import { admissionWaveService } from './AdmissionWaveService';
import { admissionAuditService } from './AdmissionAuditService';
import { enqueueNotification } from '../../notification/services';
import { NotificationCategory, NotificationPriority, NotificationChannel } from '../../notification/types';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ApplicantStatus } from '../entities/Applicant';
import { PublishResultDTO } from '../dto';

class AdmissionResultService {
  /**
   * Publishes selection results for an entire wave.
   */
  async publishWaveResults(waveId: string, actorId: string, reRegistrationDeadline?: number): Promise<Result<void>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:result:publish') && actorId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(actorId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk mempublikasikan hasil seleksi.');
      }
    }

    const waveRes = await admissionWaveService.getById(waveId);
    if (!waveRes) return fail(ErrorCodes.NOT_FOUND);

    const waveApplicantsRes = await applicantService.getByFieldResult('waveId', waveId);
    if (waveApplicantsRes.isFailure) return fail(waveApplicantsRes.getError()!);
    const applicants = waveApplicantsRes.getValue()!;

    const eligibleApplicants = applicants.filter(
      a => a.status === ApplicantStatus.SELECTED || 
           a.status === ApplicantStatus.WAITLISTED || 
           a.status === ApplicantStatus.NOT_SELECTED
    );

    const now = Date.now();

    for (const applicant of eligibleApplicants) {
      if (applicant.publishedAt) continue; // Already published

      const dto: PublishResultDTO = {
        publishedAt: now,
        resultPublishedBy: actorId,
      };

      if (applicant.status === ApplicantStatus.SELECTED) {
        dto.reRegistrationStatus = 'PENDING';
        if (reRegistrationDeadline) {
          dto.reRegistrationDeadline = reRegistrationDeadline;
        }
      }

      await applicantService.updateResult(applicant.id!, dto);
      await admissionAuditService.log(applicant.id!, 'RESULT_PUBLISHED', actorId, `Result published (${applicant.status})`);
      
      // Notify applicant
      let title = 'Pengumuman Hasil Seleksi PPDB';
      let message = 'Hasil seleksi Anda telah diumumkan. Silakan cek portal untuk melihat hasilnya.';
      
      if (applicant.status === ApplicantStatus.SELECTED) {
        title = 'Selamat! Anda Diterima';
        message = 'Selamat, Anda telah lulus seleksi PPDB. Silakan lakukan proses daftar ulang sebelum batas waktu yang ditentukan.';
      } else if (applicant.status === ApplicantStatus.WAITLISTED) {
        title = 'Status Daftar Tunggu';
        message = 'Anda masuk dalam daftar tunggu PPDB. Kami akan menginformasikan kembali jika ada kuota yang tersedia.';
      } else if (applicant.status === ApplicantStatus.NOT_SELECTED) {
        title = 'Hasil Seleksi PPDB';
        message = 'Mohon maaf, Anda belum lulus seleksi PPDB kali ini. Tetap semangat!';
      }

      await enqueueNotification({
        userId: applicant.createdBy,
        category: 'announcement',
        channels: ['in_app'],
        priority: 'high',
        payload: {
          title,
          body: message,
          data: { applicantId: applicant.id, waveId: waveId }
        }
      });
    }

    return ok(undefined);
  }

  /**
   * Completes re-registration for a selected applicant.
   */
  async completeReRegistration(applicantId: string, actorId: string): Promise<Result<void>> {
    const appRes = await applicantService.getById(applicantId);
    if (!appRes) return fail(ErrorCodes.NOT_FOUND);

    if (appRes.status !== ApplicantStatus.SELECTED) {
      return fail('Hanya pendaftar dengan status SELECTED yang dapat melakukan daftar ulang.');
    }

    if (!appRes.publishedAt) {
      return fail('Hasil seleksi belum dipublikasikan.');
    }

    if (appRes.reRegistrationStatus !== 'PENDING') {
      return fail('Status daftar ulang tidak valid untuk diproses.');
    }

    if (appRes.reRegistrationDeadline && Date.now() > appRes.reRegistrationDeadline) {
      return fail('Batas waktu daftar ulang telah berakhir.');
    }

    // Usually there might be a payment check here.
    // If we have admissionPaymentService we could check if they have a 'paid' invoice.
    // For now we assume if they can click this, they have fulfilled requirements or it's manual.
    // But Wait! In Phase 6, re-registration requires payment if required.
    // We will validate payment in the caller if needed.

    await applicantService.updateResult(applicantId, {
      reRegistrationStatus: 'COMPLETED',
      status: ApplicantStatus.ENROLLED,
      enrolledBy: actorId,
      updatedAt: Date.now()
    });

    await admissionAuditService.log(applicantId, 'RE_REGISTRATION_COMPLETED', actorId, 'Daftar ulang diselesaikan oleh ' + (actorId === appRes.createdBy ? 'Siswa' : 'Admin'));

    return ok(undefined);
  }
}

export const admissionResultService = new AdmissionResultService();
