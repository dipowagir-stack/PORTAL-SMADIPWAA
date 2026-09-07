import { getAllUserPermissions } from '../../../lib/rbac';
import { usersService } from '../../academic/services';
import { applicantService } from './ApplicantService';
import { admissionWaveService } from './AdmissionWaveService';
import { admissionAuditService } from './AdmissionAuditService';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ApplicantStatus, Applicant } from '../entities/Applicant';
import { SelectApplicantDTO } from '../dto';

class AdmissionSelectionService {
  async manuallySelectApplicant(applicantId: string, actorId: string, status: ApplicantStatus.SELECTED | ApplicantStatus.NOT_SELECTED, notes?: string, overrideQuota: boolean = false): Promise<Result<void>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:select') && actorId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(actorId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk melakukan seleksi.');
      }
    }

    // 1b. Get Applicant
    const appRes = await applicantService.getById(applicantId);
    if (!appRes) return fail(ErrorCodes.NOT_FOUND);
    if (appRes.status !== ApplicantStatus.VERIFIED && appRes.status !== ApplicantStatus.WAITLISTED) {
       return fail('Hanya applicant berstatus VERIFIED atau WAITLISTED yang dapat diseleksi');
    }

    // 2. Check Quota if Selected
    if (status === ApplicantStatus.SELECTED && !overrideQuota) {
      const waveRes = await admissionWaveService.getById(appRes.waveId);
      if (!waveRes) return fail(ErrorCodes.NOT_FOUND);
      
      const waveApplicantsRes = await applicantService.getByFieldResult('waveId', appRes.waveId);
      if (waveApplicantsRes.isFailure) return fail(waveApplicantsRes.getError()!);
      const selectedCount = waveApplicantsRes.getValue()!.filter(a => a.status === ApplicantStatus.SELECTED).length;
      
      if (selectedCount >= waveRes.quota) { // Typo fix later
        return fail('Kuota gelombang sudah penuh. Gunakan override quota jika diperlukan.');
      }
    }

    // 3. Update Status
    const dto: SelectApplicantDTO = {
      status,
      selectedBy: actorId,
      internalNotes: notes
    };
    
    const updateRes = await applicantService.selectApplicant(applicantId, dto);
    if (updateRes.isFailure) return fail(updateRes.getError()!);

    // 4. Audit Trail
    const actionName = status === ApplicantStatus.SELECTED ? 'SELECTED' : 'NOT_SELECTED';
    let auditReason = notes || '';
    if (overrideQuota) auditReason = '[OVERRIDE QUOTA] ' + auditReason;
    
    await admissionAuditService.log(applicantId, actionName, actorId, auditReason);

    return ok(undefined);
  }

  async runRuleBasedSelection(waveId: string, actorId: string): Promise<Result<void>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(actorId);
    if (!permissions.includes('admission:select') && actorId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(actorId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk menjalankan engine seleksi.');
      }
    }

    const waveRes = await admissionWaveService.getById(waveId);
    if (!waveRes) return fail(ErrorCodes.NOT_FOUND);
    
    if (!waveRes.selectionConfig || waveRes.selectionConfig.method !== 'RULE_BASED') {
      return fail('Gelombang ini tidak menggunakan metode seleksi RULE_BASED');
    }

    const quota = waveRes.quota;

    // Get all VERIFIED applicants for this wave
    const waveApplicantsRes = await applicantService.getByFieldResult('waveId', waveId);
    if (waveApplicantsRes.isFailure) return fail(waveApplicantsRes.getError()!);
    const verifiedApplicants = waveApplicantsRes.getValue()!.filter(a => a.status === ApplicantStatus.VERIFIED);

    // In a real scenario, evaluate minimumCriteria and sort by priorityCriteria.
    // For now, we just sort them by created date as a fallback priority.
    const sorted = [...verifiedApplicants].sort((a, b) => a.createdAt - b.createdAt);

    let selectedCount = 0;
    
    for (const applicant of sorted) {
      let finalStatus = ApplicantStatus.NOT_SELECTED;
      
      if (selectedCount < quota) {
         finalStatus = ApplicantStatus.SELECTED;
         selectedCount++;
      } else {
         finalStatus = ApplicantStatus.WAITLISTED; // Waitlist if quota full
      }

      const dto: SelectApplicantDTO = {
        status: finalStatus as any, // bypassing strict type if WAITLISTED is not in SelectApplicantDTO
        selectedBy: actorId,
        internalNotes: 'Auto-selection by RULE_BASED engine'
      };

      // update manually to support WAITLISTED if not in DTO
      await applicantService.updateResult(applicant.id!, {
         status: finalStatus,
         selectedBy: actorId,
         internalNotes: 'Auto-selection by RULE_BASED engine',
         updatedAt: Date.now()
      });
      
      const actionName = finalStatus === ApplicantStatus.SELECTED ? 'SELECTED' : (finalStatus === ApplicantStatus.WAITLISTED ? 'WAITLISTED' : 'NOT_SELECTED');
      await admissionAuditService.log(applicant.id!, actionName, actorId, 'Auto-selected');
    }

    return ok(undefined);
  }
}

export const admissionSelectionService = new AdmissionSelectionService();
