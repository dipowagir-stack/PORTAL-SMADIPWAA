import { GenericAdmissionService } from './GenericAdmissionService';
import { AdmissionAudit } from '../entities/AdmissionAudit';
import { admissionAuditRepo } from '../repositories/AdmissionAuditRepository';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';

class AdmissionAuditService extends GenericAdmissionService<AdmissionAudit> {
  async log(applicantId: string, action: string, actorId: string, reason?: string, metadata?: any): Promise<Result<AdmissionAudit>> {
    const audit: AdmissionAudit = {
      applicantId,
      action,
      actorId,
      reason,
      metadata,
      timestamp: Date.now(),
    };
    return await this.createResult(audit);
  }

  async getByApplicant(applicantId: string): Promise<Result<AdmissionAudit[]>> {
    return await this.getByFieldResult('applicantId', applicantId);
  }
}

export const admissionAuditService = new AdmissionAuditService(admissionAuditRepo);
