import { SupervisionStatus, SupervisionStatusType } from './SupervisionStatus';
import { SupervisionType } from './SupervisionType';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';

export interface ObservationData {
  rubricId: string;
  scores: Record<string, number>;
  notes: string;
}

export type RecommendationStatus = 'CONTINUE' | 'IMPROVEMENT_REQUIRED' | 'FOLLOW_UP_REQUIRED';

export interface FinalResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  category: string;
}

export interface FinalFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recommendationStatus: RecommendationStatus;
}

export interface FeedbackData {
  strengths: string[];
  areasForImprovement: string[];
  actionPlan: string;
}

export interface SupervisionSessionProps {
  id?: string;
  tenantId: string;
  academicYearId: string;
  semesterId: string;
  principalId: string;
  teacherId: string;
  scheduledDate: number;
  status: SupervisionStatus;
  type: SupervisionType;
  observation?: ObservationData;
  feedback?: FeedbackData;
  finalResult?: FinalResult;
  finalFeedback?: FinalFeedback;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export class SupervisionSession {
  private constructor(public props: SupervisionSessionProps) {}

  public static create(props: Omit<SupervisionSessionProps, 'createdAt' | 'updatedAt' | 'status'> & { id?: string, status?: SupervisionStatus }): SupervisionSession {
    const now = Date.now();
    return new SupervisionSession({
      ...props,
      status: props.status || SupervisionStatus.create('DRAFT'),
      createdAt: now,
      updatedAt: now
    });
  }
  
  public transitionTo(newStatus: SupervisionStatus, updatedBy: string): Result<void> {
    const current = this.props.status.value;
    const target = newStatus.value;
    
    // Status machine validation
    const validTransitions: Record<SupervisionStatusType, SupervisionStatusType[]> = {
      'DRAFT': ['SCHEDULED', 'CANCELLED'],
      'SCHEDULED': ['SUBMITTED', 'CANCELLED'],
      'SUBMITTED': ['UNDER_REVIEW', 'CANCELLED'],
      'UNDER_REVIEW': ['REVISION_REQUIRED', 'COMPLETED', 'CANCELLED'],
      'REVISION_REQUIRED': ['RESUBMITTED', 'CANCELLED'],
      'RESUBMITTED': ['UNDER_REVIEW', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[current].includes(target)) {
      return fail(`Invalid transition from ${current} to ${target}`);
    }

    this.props.status = newStatus;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = Date.now();

    if (target === 'UNDER_REVIEW' && !this.props.startedAt) {
      this.props.startedAt = Date.now();
    }
    if (target === 'COMPLETED') {
      this.props.completedAt = Date.now();
    }

    return ok(void 0);
  }

  // Backward compatibility alias (deprecated)
  public updateStatus(newStatus: SupervisionStatus): void {
    this.transitionTo(newStatus, this.props.updatedBy || 'system');
  }

  public addObservation(data: ObservationData, updatedBy: string): void {
    this.props.observation = data;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = Date.now();
  }

  public addFeedback(data: FeedbackData, updatedBy: string): void {
    this.props.feedback = data;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = Date.now();
  }

  public addFinalResult(data: FinalResult, updatedBy: string): void {
    this.props.finalResult = data;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = Date.now();
  }

  public addFinalFeedback(data: FinalFeedback, updatedBy: string): void {
    this.props.finalFeedback = data;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = Date.now();
  }
}
