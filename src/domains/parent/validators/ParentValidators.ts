import { CreateParentProfileDTO } from '../dtos/ParentDTO';
import { Result, fail, ok } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';

export class ParentValidators {
  static validateCreateProfile(dto: CreateParentProfileDTO): Result<void> {
    if (!dto.userId) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.fullName || dto.fullName.trim().length === 0) return fail(ErrorCodes.VALIDATION_ERROR);
    if (!dto.email || !dto.email.includes('@')) return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(undefined);
  }
}
