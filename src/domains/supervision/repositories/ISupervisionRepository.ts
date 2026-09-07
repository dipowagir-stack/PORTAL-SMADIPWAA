import { BaseRepository } from '../../../foundation/core/BaseRepository';
import { SupervisionSession } from '../models/SupervisionSession';

export interface ISupervisionRepository extends BaseRepository<SupervisionSession> {
  findByTeacherId(tenantId: string, teacherId: string): Promise<SupervisionSession[]>;
  findBySupervisorId(tenantId: string, supervisorId: string): Promise<SupervisionSession[]>;
  findByStatus(tenantId: string, status: string): Promise<SupervisionSession[]>;
  findByPeriod(tenantId: string, academicYearId: string, semesterId: string): Promise<SupervisionSession[]>;
  findByTenant(tenantId: string): Promise<SupervisionSession[]>;
}
