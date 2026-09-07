import { BaseRepository } from '../../../../foundation/core/BaseRepository';
import { ParentApproval } from '../types';

export interface IApprovalRepository extends BaseRepository<ParentApproval> {
  findByParentId(parentId: string): Promise<ParentApproval[]>;
  findByStudentId(studentId: string): Promise<ParentApproval[]>;
  findByApproverId(approverId: string): Promise<ParentApproval[]>;
}
