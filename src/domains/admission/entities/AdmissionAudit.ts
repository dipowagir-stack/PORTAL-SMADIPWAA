export interface AdmissionAudit {
  id?: string;
  applicantId: string;
  action: string;
  actorId: string;
  reason?: string;
  timestamp: number;
  metadata?: any;
}
