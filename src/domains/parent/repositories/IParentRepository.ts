import { BaseRepository } from '../../../foundation/core/BaseRepository';
import { Parent, ParentStudentRelation, ParentPreference } from '../types';
import { ParentInvitation } from '../dtos/ParentInvitationDTO';

export interface IParentRepository extends BaseRepository<Parent> {
  findByUserId(userId: string): Promise<Parent | null>;
  findByPhoneNumber(phoneNumber: string): Promise<Parent | null>;
}

export interface IParentStudentRelationRepository extends BaseRepository<ParentStudentRelation> {
  findRelationsByParentId(parentId: string): Promise<ParentStudentRelation[]>;
  findRelationsByStudentId(studentId: string): Promise<ParentStudentRelation[]>;
}

export interface IParentPreferenceRepository extends BaseRepository<ParentPreference> {
  findByParentId(parentId: string): Promise<ParentPreference | null>;
}

export interface IParentInvitationRepository extends BaseRepository<ParentInvitation> {
  findByToken(token: string): Promise<ParentInvitation | null>;
  findByPhoneNumber(phoneNumber: string): Promise<ParentInvitation[]>;
  findByStudentId(studentId: string): Promise<ParentInvitation[]>;
  findActiveByEmailAndStudent?(email: string, studentId: string): Promise<ParentInvitation[]>;
}
