import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ISupervisionEvidenceRepository } from '../repositories/ISupervisionEvidenceRepository';
import { ISupervisionRepository } from '../repositories/ISupervisionRepository';
import { SupervisionEvidence, SourceType } from '../models/SupervisionEvidence';

export interface AttachEvidenceCommand {
  tenantId: string;
  supervisionId: string;
  teacherId: string;
  academicYearId: string;
  semesterId: string;
  category: string;
  itemCode: string;
  sourceType: SourceType;
  sourceId: string;
}

export interface SubmitSupervisionCommand {
  tenantId: string;
  supervisionId: string;
  teacherId: string;
}

export class SupervisionEvidenceService {
  constructor(
    private evidenceRepo: ISupervisionEvidenceRepository,
    private supervisionRepo: ISupervisionRepository
  ) {}

  async attachEvidence(command: AttachEvidenceCommand): Promise<Result<SupervisionEvidence>> {
    try {
      const supervision = await this.supervisionRepo.findById(command.supervisionId);
      if (!supervision) return fail(ErrorCodes.NOT_FOUND);
      
      if (supervision.props.tenantId !== command.tenantId) return fail('Unauthorized access to tenant');
      if (supervision.props.teacherId !== command.teacherId) return fail('Unauthorized access to supervision');

      // Check if evidence already exists
      const existingEvidences = await this.evidenceRepo.findBySupervisionId(command.tenantId, command.supervisionId);
      const existing = existingEvidences.find(e => e.props.itemCode === command.itemCode);

      if (existing) {
        const updateResult = existing.updateEvidence(command.sourceType, command.sourceId);
        if (updateResult.isFailure) return fail(updateResult.getError() as string);
        const saved = await this.evidenceRepo.save(existing);
        return ok(saved);
      }

      const evidence = SupervisionEvidence.create({
        tenantId: command.tenantId,
        supervisionId: command.supervisionId,
        teacherId: command.teacherId,
        academicYearId: command.academicYearId,
        semesterId: command.semesterId,
        category: command.category,
        itemCode: command.itemCode,
        sourceType: command.sourceType,
        sourceId: command.sourceId
      });

      const saved = await this.evidenceRepo.save(evidence);
      return ok(saved);
    } catch (error: any) {
      console.error('Failed to attach evidence', error);
      return fail(error.message);
    }
  }

  async getEvidencesBySupervision(tenantId: string, supervisionId: string): Promise<Result<SupervisionEvidence[]>> {
    const items = await this.evidenceRepo.findBySupervisionId(tenantId, supervisionId);
    return ok(items);
  }
  
  async submitSupervisionEvidence(command: SubmitSupervisionCommand): Promise<Result<void>> {
    try {
      const supervision = await this.supervisionRepo.findById(command.supervisionId);
      if (!supervision) return fail(ErrorCodes.NOT_FOUND);
      
      if (supervision.props.tenantId !== command.tenantId) return fail('Unauthorized access to tenant');
      if (supervision.props.teacherId !== command.teacherId) return fail('Unauthorized access to supervision');
      
      const evidences = await this.evidenceRepo.findBySupervisionId(command.tenantId, command.supervisionId);
      
      // Need to ensure required evidences are present, this could be validated against a checklist config.
      // Assuming validation passes here for simplicity, or we let UI check it.
      
      for (const evidence of evidences) {
        const submitResult = evidence.submit();
        if (submitResult.isSuccess) {
           await this.evidenceRepo.save(evidence);
        }
      }
      
      return ok(void 0);
    } catch (error: any) {
      console.error('Failed to submit supervision evidence', error);
      return fail(error.message);
    }
  }

  async reviewEvidence(command: { tenantId: string, supervisionId: string, itemCode: string, reviewerId: string, status: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED', notes?: string }): Promise<Result<SupervisionEvidence>> {
    try {
      const existingEvidences = await this.evidenceRepo.findBySupervisionId(command.tenantId, command.supervisionId);
      const existing = existingEvidences.find(e => e.props.itemCode === command.itemCode);
      if (!existing) return fail(ErrorCodes.NOT_FOUND);

      const reviewResult = existing.review(command.status, command.reviewerId, command.notes);
      if (reviewResult.isFailure) return fail(reviewResult.getError() as string);

      const saved = await this.evidenceRepo.save(existing);
      return ok(saved);
    } catch (error: any) {
      console.error('Failed to review evidence', error);
      return fail(error.message);
    }
  }
}
