import { SupervisionFollowUp } from '../models/SupervisionFollowUp';

export interface ISupervisionFollowUpRepository {
  save(followUp: SupervisionFollowUp): Promise<SupervisionFollowUp>;
  findById(id: string): Promise<SupervisionFollowUp | null>;
  findBySupervisionId(tenantId: string, supervisionId: string): Promise<SupervisionFollowUp[]>;
  findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionFollowUp[]>;
}
