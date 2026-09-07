import { getAllUserPermissions } from '../../../lib/rbac';
import { usersService } from '../../academic/services';
import { applicantService } from './ApplicantService';
import { admissionDocumentService } from './AdmissionDocumentService';
import { admissionAuditService } from './AdmissionAuditService';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ApplicantStatus } from '../entities/Applicant';
import { VerifyApplicantDTO } from '../dto';

class AdmissionVerificationService {
  async verifyApplicant(applicantId: string, actorId: string, notes?: string): Promise<Result<void>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:verify') && actorId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(actorId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk melakukan verifikasi.');
      }
    }

    // 1b. Get Applicant
    const appRes = await applicantService.getById(applicantId);
    if (!appRes) return fail(ErrorCodes.NOT_FOUND);
    if (appRes.status !== ApplicantStatus.SUBMITTED && appRes.status !== ApplicantStatus.DOCUMENT_REVIEW) {
       return fail('Status pendaftar tidak valid untuk verifikasi');
    }

    // 2. Check Documents (All required must be APPROVED)
    const docsRes = await admissionDocumentService.getDocumentsForApplicant(applicantId);
    if (docsRes.isFailure) return fail(docsRes.getError()!);
    const documents = docsRes.getValue()!;
    
    const requirementsRes = await admissionDocumentService.getRequirementsForApplicant(applicantId);
    if (requirementsRes.isFailure) return fail(requirementsRes.getError()!);
    const requirements = requirementsRes.getValue()!;

    for (const req of requirements) {
       if (req.isRequired) {
          const doc = documents.find(d => d.metadata?.requirementId === req.id);
          if (!doc) {
             return fail(`Dokumen wajib belum diunggah: ${req.documentName}`);
          }
          if (doc.status !== 'APPROVED') {
             return fail(`Dokumen wajib belum disetujui: ${req.documentName}`);
          }
       }
    }

    // 3. Set VERIFIED
    const dto: VerifyApplicantDTO = {
       status: ApplicantStatus.VERIFIED,
       approvedBy: actorId,
       adminNotes: notes
    };
    
    const updateRes = await applicantService.verifyApplicant(applicantId, dto);
    if (updateRes.isFailure) return fail(updateRes.getError()!);

    // 4. Audit Trail
    await admissionAuditService.log(applicantId, 'VERIFIED', actorId, notes);

    // 5. Send Notification (Optional, hook up if needed)

    return ok(undefined);
  }

  async requestRevision(applicantId: string, actorId: string, reason: string): Promise<Result<void>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:verify') && actorId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(actorId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk meminta revisi.');
      }
    }

    if (!reason) return fail('Alasan perbaikan wajib diisi');

    const appRes = await applicantService.getById(applicantId);
    if (!appRes) return fail(ErrorCodes.NOT_FOUND);

    const dto: VerifyApplicantDTO = {
       status: ApplicantStatus.DOCUMENT_REVISION,
       approvedBy: actorId,
       adminNotes: reason
    };

    const updateRes = await applicantService.verifyApplicant(applicantId, dto);
    if (updateRes.isFailure) return fail(updateRes.getError()!);

    await admissionAuditService.log(applicantId, 'REVISION_REQUESTED', actorId, reason);

    return ok(undefined);
  }
}

export const admissionVerificationService = new AdmissionVerificationService();
