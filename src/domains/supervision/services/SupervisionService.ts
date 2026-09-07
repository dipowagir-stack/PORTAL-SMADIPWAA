import { SupervisionSession, ObservationData, FeedbackData, FinalResult, FinalFeedback } from '../models/SupervisionSession';
import { ISupervisionRepository } from '../repositories/ISupervisionRepository';
import { ISupervisionEvidenceRepository } from '../repositories/ISupervisionEvidenceRepository';
import { ISupervisionFollowUpRepository } from '../repositories/ISupervisionFollowUpRepository';
import { SupervisionStatus, SupervisionStatusType } from '../models/SupervisionStatus';
import { SupervisionType } from '../models/SupervisionType';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { SupervisionNotificationService } from './SupervisionNotificationService';
import { validateSupervisionFinalization } from '../rules/SupervisionValidationRules';
import { SupervisionEvidenceRepositoryImpl } from '../repositories/SupervisionEvidenceRepositoryImpl';
import { SupervisionFollowUpRepositoryImpl } from '../repositories/SupervisionFollowUpRepositoryImpl';
import { SupervisionFollowUp } from '../models/SupervisionFollowUp';

export interface CreateSupervisionCommand {
  tenantId: string;
  academicYearId: string;
  semesterId: string;
  principalId: string;
  teacherId: string;
  scheduledDate: number;
  type: string;
  createdBy: string;
}

export class SupervisionService {
  private evidenceRepo: ISupervisionEvidenceRepository;
  private followUpRepo: ISupervisionFollowUpRepository;
  
  constructor(
    private repo: ISupervisionRepository, 
    evidenceRepo?: ISupervisionEvidenceRepository,
    followUpRepo?: ISupervisionFollowUpRepository
  ) {
    this.evidenceRepo = evidenceRepo || new SupervisionEvidenceRepositoryImpl();
    this.followUpRepo = followUpRepo || new SupervisionFollowUpRepositoryImpl();
  }

  async createSupervision(command: CreateSupervisionCommand): Promise<Result<SupervisionSession>> {
    try {
      const session = SupervisionSession.create({
        tenantId: command.tenantId,
        academicYearId: command.academicYearId,
        semesterId: command.semesterId,
        principalId: command.principalId,
        teacherId: command.teacherId,
        scheduledDate: command.scheduledDate,
        type: SupervisionType.create(command.type as any),
        createdBy: command.createdBy,
        updatedBy: command.createdBy
      });
      const saved = await this.repo.save(session);
      
      SupervisionNotificationService.sendAssignedNotification(
        command.tenantId, saved.props.id!, command.teacherId, command.principalId
      ).catch(err => console.error('Failed to send notification', err));

      return ok(saved);
    } catch (error: any) {
      console.error('Failed to create supervision', error);
      return fail(error.message);
    }
  }

  async getSession(id: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);
    return ok(session);
  }

  async updateSessionStatus(id: string, status: SupervisionStatusType, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);
    
    const prevStatus = session.props.status.value;
    const transitionResult = session.transitionTo(SupervisionStatus.create(status), updatedBy);
    if (!transitionResult.isSuccess) {
       return fail((transitionResult as any).getError() as string);
    }

    const saved = await this.repo.save(session);
    
    const { tenantId, teacherId, principalId } = session.props;
    
    // Notification logic
    try {
      if (status === 'SUBMITTED' && prevStatus !== 'SUBMITTED') {
        SupervisionNotificationService.sendEvidenceSubmittedNotification(tenantId, id, teacherId, principalId);
      } else if (status === 'RESUBMITTED' && prevStatus !== 'RESUBMITTED') {
        SupervisionNotificationService.sendEvidenceResubmittedNotification(tenantId, id, teacherId, principalId);
      } else if (status === 'REVISION_REQUIRED' && prevStatus !== 'REVISION_REQUIRED') {
        SupervisionNotificationService.sendRevisionRequiredNotification(tenantId, id, teacherId, principalId);
      } else if (status === 'COMPLETED' && prevStatus !== 'COMPLETED') {
        SupervisionNotificationService.sendReviewCompletedNotification(tenantId, id, teacherId, principalId);
      }
    } catch (e) {
      console.error('Notification failure', e);
    }

    return ok(saved);
  }

  async submitObservation(id: string, data: ObservationData, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);
    
    session.addObservation(data, updatedBy);
    const saved = await this.repo.save(session);
    return ok(saved);
  }

  async submitFeedback(id: string, data: FeedbackData, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);
    
    session.addFeedback(data, updatedBy);
    const saved = await this.repo.save(session);
    return ok(saved);
  }

  async submitFinalResult(id: string, data: FinalResult, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);

    if (session.props.status.value === 'COMPLETED') {
      return fail('Cannot modify final result of a completed supervision.');
    }

    session.addFinalResult(data, updatedBy);
    const saved = await this.repo.save(session);
    return ok(saved);
  }

  async submitFinalFeedback(id: string, data: FinalFeedback, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);

    if (session.props.status.value === 'COMPLETED') {
      return fail('Cannot modify final feedback of a completed supervision.');
    }

    session.addFinalFeedback(data, updatedBy);
    const saved = await this.repo.save(session);
    return ok(saved);
  }

  async finalizeSupervision(id: string, updatedBy: string): Promise<Result<SupervisionSession>> {
    const session = await this.repo.findById(id);
    if (!session) return fail(ErrorCodes.NOT_FOUND);

    if (session.props.status.value === 'COMPLETED') {
      return ok(session); // Idempotent
    }

    const evidences = await this.evidenceRepo.findBySupervisionId(session.props.tenantId, id);
    const validation = validateSupervisionFinalization(session, evidences);
    if (!validation.passed) {
      return fail(validation.message || 'Validation failed for finalization.');
    }

    const transitionResult = session.transitionTo(SupervisionStatus.create('COMPLETED'), updatedBy);
    if (!transitionResult.isSuccess) {
      return fail((transitionResult as any).getError() as string);
    }

    const saved = await this.repo.save(session);

    if (session.props.finalFeedback?.recommendationStatus === 'FOLLOW_UP_REQUIRED') {
      const followUpPromises = session.props.finalFeedback.recommendations.map(rec => {
        const followUp = SupervisionFollowUp.create({
          supervisionId: id,
          teacherId: session.props.teacherId,
          tenantId: session.props.tenantId,
          academicYearId: session.props.academicYearId,
          semesterId: session.props.semesterId,
          target: rec,
          action: 'Follow-up required based on supervision final recommendation',
          dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days from now default
        });
        return this.followUpRepo.save(followUp);
      });
      await Promise.all(followUpPromises);
    }

    // Notifications and follow-up generation could be triggered here
    SupervisionNotificationService.sendReviewCompletedNotification(
      session.props.tenantId, 
      id, 
      session.props.teacherId, 
      session.props.principalId
    ).catch(e => console.error('Notification failure', e));

    return ok(saved);
  }

  async getFollowUps(tenantId: string, supervisionId: string): Promise<Result<SupervisionFollowUp[]>> {
    const followUps = await this.followUpRepo.findBySupervisionId(tenantId, supervisionId);
    return ok(followUps);
  }

  async updateFollowUpStatus(tenantId: string, followUpId: string, status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'): Promise<Result<SupervisionFollowUp>> {
    const followUp = await this.followUpRepo.findById(followUpId);
    if (!followUp) return fail(ErrorCodes.NOT_FOUND);
    if (followUp.props.tenantId !== tenantId) return fail('Unauthorized tenant access to follow-up.');

    followUp.updateStatus(status);
    const saved = await this.followUpRepo.save(followUp);
    return ok(saved);
  }
}
