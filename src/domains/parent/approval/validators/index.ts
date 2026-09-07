import { CreateApprovalDTO, UpdateApprovalDTO, ReviewApprovalDTO, CancelApprovalDTO } from '../dtos';
import { Result, fail, ok } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';

export class ApprovalValidators {
  static validateCreate(dto: CreateApprovalDTO): Result<boolean> {
    if (!dto.parentId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.studentId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.type) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.title || dto.title.trim() === '') return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }

  static validateUpdate(dto: UpdateApprovalDTO): Result<boolean> {
    if (!dto.approvalId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.actorId) return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }

  static validateReview(dto: ReviewApprovalDTO): Result<boolean> {
    if (!dto.approvalId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.actorId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (dto.action !== 'Approve' && dto.action !== 'Reject') return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }

  static validateCancel(dto: CancelApprovalDTO): Result<boolean> {
    if (!dto.approvalId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.actorId) return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }
}
