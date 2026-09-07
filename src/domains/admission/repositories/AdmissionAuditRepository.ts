import { FirestoreRepository } from './FirestoreRepository';
import { AdmissionAudit } from '../entities/AdmissionAudit';

class AdmissionAuditRepository extends FirestoreRepository<AdmissionAudit> {
  constructor() {
    super('admission_audits');
  }
}

export const admissionAuditRepo = new AdmissionAuditRepository();
