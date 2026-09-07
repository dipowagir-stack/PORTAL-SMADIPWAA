import { BaseRepository } from '../../../foundation/core/BaseRepository';
import { SupervisionEvidence } from '../models/SupervisionEvidence';

export interface ISupervisionEvidenceRepository extends BaseRepository<SupervisionEvidence> {
  findBySupervisionId(tenantId: string, supervisionId: string): Promise<SupervisionEvidence[]>;
  findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionEvidence[]>;
  findByPeriod(tenantId: string, academicYearId: string, semesterId: string): Promise<SupervisionEvidence[]>;
}
