import { ApprovalType } from '../types';

export interface CreateApprovalDTO {
  parentId: string;
  studentId: string;
  type: ApprovalType;
  title: string;
  description: string;
  approverId?: string;
  approverRole?: string;
  attachments?: string[];
  isDraft?: boolean;
}

export interface UpdateApprovalDTO {
  approvalId: string;
  actorId: string;
  actorRole: string;
  title?: string;
  description?: string;
  attachments?: string[];
}

export interface ReviewApprovalDTO {
  approvalId: string;
  actorId: string;
  actorRole: string;
  action: 'Approve' | 'Reject';
  notes?: string;
}

export interface CancelApprovalDTO {
  approvalId: string;
  actorId: string;
  actorRole: string;
  notes?: string;
}
