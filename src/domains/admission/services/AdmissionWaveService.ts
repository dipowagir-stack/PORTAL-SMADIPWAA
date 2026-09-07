import { Result, fail } from '../../../foundation/core/Result';
import { AdmissionWave, WaveStatus } from '../entities/AdmissionWave';
import { admissionWaveRepo } from '../repositories';
import { GenericAdmissionService } from './GenericAdmissionService';
import { CreateAdmissionWaveDTO } from '../dto';
import { validateCreateWave } from '../validators';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';

class AdmissionWaveService extends GenericAdmissionService<AdmissionWave> {
  async createWave(dto: CreateAdmissionWaveDTO): Promise<Result<AdmissionWave>> {
    const errors = validateCreateWave(dto);
    if (errors.length > 0) {
      return fail(ErrorCodes.VALIDATION_ERROR);
    }
    
    const wave: AdmissionWave = {
      ...dto,
      status: dto.status || WaveStatus.DRAFT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return await this.createResult(wave);
  }
}

export const admissionWaveService = new AdmissionWaveService(admissionWaveRepo);
