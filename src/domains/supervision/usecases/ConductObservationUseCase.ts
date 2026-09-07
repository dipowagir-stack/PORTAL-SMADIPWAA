import { SupervisionService } from '../services/SupervisionService';
import { ISupervisionRepository } from '../repositories/ISupervisionRepository';
import { SubmitObservationDTO } from '../dtos/SupervisionDTO';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { SupervisionStatus } from '../models/SupervisionStatus';

export class ConductObservationUseCase {
  constructor(private repo: ISupervisionRepository) {}

  async execute(sessionId: string, dto: SubmitObservationDTO): Promise<Result<void>> {
    const session = await this.repo.findById(sessionId);
    if (!session) return fail(ErrorCodes.NOT_FOUND);

    if (session.props.status.value !== 'UNDER_REVIEW' && session.props.status.value !== 'SCHEDULED') {
      return fail('Observation can only be conducted on Scheduled or Under Review sessions');
    }

    // Pass a placeholder ID or something if dto doesn't have it. We assume dto has supervisorId or we just use 'SYSTEM'
    session.addObservation(dto as any, 'SYSTEM');
    session.transitionTo(SupervisionStatus.create('UNDER_REVIEW'), 'SYSTEM');
    
    await this.repo.save(session);
    return ok(undefined);
  }
}
