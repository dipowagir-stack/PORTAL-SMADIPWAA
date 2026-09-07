import { RelationRole, ParentAccessLevel, ApprovalTargetType } from '../types';

export interface CreateParentProfileDTO {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

export interface UpdateParentProfileDTO {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

export interface LinkStudentDTO {
  parentId: string;
  studentId: string;
  relationRole: RelationRole;
  isPrimary?: boolean;
  accessPermissions?: ParentAccessLevel[];
}

export interface SubmitApprovalDTO {
  parentId: string;
  studentId: string;
  targetType: ApprovalTargetType;
  targetId: string;
  status: 'Approved' | 'Rejected';
  notes?: string;
}
