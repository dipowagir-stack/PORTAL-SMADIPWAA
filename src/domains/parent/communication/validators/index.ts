import { CreateThreadDTO, SendMessageDTO } from '../dtos';
import { Result, fail, ok } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';

export class CommunicationValidators {
  static validateCreateThread(dto: CreateThreadDTO): Result<boolean> {
    if (!dto.studentId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.parentId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.targetUserId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.subject || dto.subject.trim() === '') return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.initialMessage || dto.initialMessage.trim() === '') return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }

  static validateSendMessage(dto: SendMessageDTO): Result<boolean> {
    if (!dto.threadId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.senderId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.body || dto.body.trim() === '') return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }
}
