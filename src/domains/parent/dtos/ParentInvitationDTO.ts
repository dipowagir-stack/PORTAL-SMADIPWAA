import { RelationRole } from '../types';

export type InvitationStatus = 'Draft' | 'Pending' | 'Sent' | 'Activated' | 'Expired' | 'Revoked';

export interface ParentInvitation {
  id?: string;
  studentId: string;
  relationRole: RelationRole;
  targetEmail: string;
  targetPhone?: string;
  token: string;
  status: InvitationStatus;
  invitedByUserId: string; // TU / Admin user id
  expiresAt: number;
  createdAt: number;
  activatedAt?: number;
}

export interface CreateInvitationDTO {
  studentId: string;
  relationRole: RelationRole;
  targetEmail: string;
  targetPhone?: string;
  invitedByUserId: string;
}

export interface ClaimInvitationDTO {
  token: string;
  parentUserId: string; // The uid from Firebase Auth after the parent signs up/logs in
  parentFullName: string;
}
