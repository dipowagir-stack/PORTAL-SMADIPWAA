import { ValueObject } from '../../../foundation/core/ValueObject';
import { Result, ok, fail } from '../../../foundation/core/Result';

export type EvidenceStatusType = 
  | 'MISSING' 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REVISION_REQUIRED' 
  | 'REJECTED'
  | 'RESUBMITTED';

export type SourceType = 'DOCUMENT' | 'SYSTEM_RECORD' | 'MANUAL_ENTRY' | 'NOT_AVAILABLE';

export interface ReviewHistoryEntry {
  iteration: number;
  status: EvidenceStatusType;
  reviewerId: string;
  notes?: string;
  timestamp: number;
}

interface SupervisionEvidenceProps {
  id?: string;
  tenantId: string;
  supervisionId: string;
  teacherId: string;
  academicYearId: string;
  semesterId: string;
  category: string;
  itemCode: string;
  sourceType: SourceType;
  sourceId: string;
  status: EvidenceStatusType;
  reviewerId?: string;
  reviewerNotes?: string;
  submittedAt?: number;
  createdAt: number;
  updatedAt: number;
  iteration?: number;
  reviewHistory?: ReviewHistoryEntry[];
}

export class SupervisionEvidence {
  private constructor(public props: SupervisionEvidenceProps) {}

  public static create(props: Omit<SupervisionEvidenceProps, 'createdAt' | 'updatedAt' | 'status' | 'iteration' | 'reviewHistory'> & { id?: string, status?: EvidenceStatusType }): SupervisionEvidence {
    const now = Date.now();
    return new SupervisionEvidence({
      ...props,
      status: props.status || 'DRAFT',
      iteration: 1,
      reviewHistory: [],
      createdAt: now,
      updatedAt: now
    });
  }

  public updateEvidence(sourceType: SourceType, sourceId: string): Result<void> {
    if (this.props.status === 'SUBMITTED' || this.props.status === 'UNDER_REVIEW' || this.props.status === 'APPROVED') {
      return fail('Cannot modify evidence that is currently submitted, under review, or approved.');
    }
    
    this.props.sourceType = sourceType;
    this.props.sourceId = sourceId;
    
    this.props.updatedAt = Date.now();
    return ok(void 0);
  }

  public submit(): Result<void> {
    if (this.props.status === 'SUBMITTED' || this.props.status === 'UNDER_REVIEW' || this.props.status === 'APPROVED') {
      return fail('Evidence is already in a submitted state.');
    }
    if (this.props.status === 'REVISION_REQUIRED') {
      this.props.status = 'RESUBMITTED';
      this.props.iteration = (this.props.iteration || 1) + 1;
    } else {
      this.props.status = 'SUBMITTED';
    }
    this.props.submittedAt = Date.now();
    this.props.updatedAt = Date.now();
    return ok(void 0);
  }

  public review(status: EvidenceStatusType, reviewerId: string, notes?: string): Result<void> {
    this.props.status = status;
    this.props.reviewerId = reviewerId;
    if (notes) {
      this.props.reviewerNotes = notes;
    }
    
    if (!this.props.reviewHistory) {
      this.props.reviewHistory = [];
    }
    
    this.props.reviewHistory.push({
      iteration: this.props.iteration || 1,
      status,
      reviewerId,
      notes,
      timestamp: Date.now()
    });
    
    this.props.updatedAt = Date.now();
    return ok(void 0);
  }
}
