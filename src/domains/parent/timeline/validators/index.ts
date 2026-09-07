import { GetTimelineDTO } from '../dtos';
import { Result, fail, ok } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';

export class TimelineValidators {
  static validateGetTimeline(dto: GetTimelineDTO): Result<boolean> {
    if (!dto.parentId) return fail(ErrorCodes.VALIDATION_ERROR);
    return ok(true);
  }
}
