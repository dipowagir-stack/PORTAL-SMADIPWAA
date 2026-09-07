import { Result, fail } from '../../../foundation/core/Result';
import { Registration } from '../entities/Registration';
import { registrationRepo } from '../repositories';
import { GenericAdmissionService } from './GenericAdmissionService';
import { CreateRegistrationDTO } from '../dto';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';

class RegistrationService extends GenericAdmissionService<Registration> {
  async register(dto: CreateRegistrationDTO): Promise<Result<Registration>> {
    const registration: Registration = {
      ...dto,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return await this.createResult(registration);
  }
}

export const registrationService = new RegistrationService(registrationRepo);
