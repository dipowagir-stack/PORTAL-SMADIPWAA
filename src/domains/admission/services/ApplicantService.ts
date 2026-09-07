import { Result, ok, fail } from '../../../foundation/core/Result';
import { Applicant, ApplicantStatus } from '../entities/Applicant';
import { applicantRepo } from '../repositories';
import { GenericAdmissionService } from './GenericAdmissionService';
import { CreateApplicantDTO, UpdateApplicantDTO, VerifyApplicantDTO, SelectApplicantDTO, EnrollApplicantDTO } from '../dto';
import { validateCreateApplicant } from '../validators';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { registrationService } from './RegistrationService';
import { admissionWaveService } from './AdmissionWaveService';
import { WaveStatus } from '../entities/AdmissionWave';

class ApplicantService extends GenericAdmissionService<Applicant> {
  async registerApplicant(dto: CreateApplicantDTO, userId: string): Promise<Result<Applicant>> {
    const errors = validateCreateApplicant(dto);
    if (errors.length > 0) {
      return fail(ErrorCodes.VALIDATION_ERROR);
    }
    
    const yearCode = dto.academicYear.replace('/', '');
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
    const registrationNumber = `REG-${yearCode}-${randomHex}`;

    const applicant: Applicant = {
      ...dto,
      registrationNumber,
      status: ApplicantStatus.DRAFT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    return await this.createResult(applicant);
  }
  
  async getApplicantByUserId(userId: string): Promise<Result<Applicant | null>> {
    const res = await this.getByFieldResult('createdBy', userId);
    if (res.isFailure) return fail(res.getError());
    const data = res.getValue();
    return ok(data.length > 0 ? data[0] : null);
  }

  async saveDraftApplicant(dto: UpdateApplicantDTO, userId: string, applicantId?: string): Promise<Result<Applicant>> {
    if (applicantId) {
      const applicantRes = await this.getById(applicantId);
      if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
      if (applicantRes.createdBy !== userId) return fail(ErrorCodes.UNAUTHORIZED);
      if (applicantRes.status !== ApplicantStatus.DRAFT) return fail(ErrorCodes.VALIDATION_ERROR);

      return await this.updateResult(applicantId, {
        ...dto,
        updatedAt: Date.now(),
      });
    } else {
      const applicant: Partial<Applicant> = {
        ...dto,
        status: ApplicantStatus.DRAFT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userId,
      };
      // We don't generate registrationNumber on draft, only on submit
      return await this.createResult(applicant);
    }
  }

  async submitApplicant(id: string, userId: string): Promise<Result<Applicant>> {
    const applicantRes = await this.getById(id);
    if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
    if (applicantRes.createdBy !== userId) return fail(ErrorCodes.UNAUTHORIZED);
    if (applicantRes.status !== ApplicantStatus.DRAFT && applicantRes.status !== ApplicantStatus.DOCUMENT_REVISION) {
      return fail(ErrorCodes.VALIDATION_ERROR);
    }

    // 1. Validate Data
    const errors = validateCreateApplicant(applicantRes as any);
    if (errors.length > 0) {
      return fail(ErrorCodes.VALIDATION_ERROR);
    }

    // 2. Validate Admission Wave
    const waveRes = await admissionWaveService.getById(applicantRes.waveId);
    if (!waveRes || waveRes.status !== WaveStatus.OPEN) {
      return fail('Gelombang pendaftaran tidak valid atau sudah ditutup');
    }

    // 3. Generate Registration Number
    const yearCode = applicantRes.academicYear.replace('/', '');
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
    const registrationNumber = `REG-${yearCode}-${randomHex}`;

    // 4. Create Registration
    const registrationRes = await registrationService.register({
      applicantId: id,
      registrationNumber,
      academicYear: applicantRes.academicYear,
      waveId: applicantRes.waveId,
      status: 'SUBMITTED',
      submittedAt: Date.now()
    });
    
    if (registrationRes.isFailure) {
      return fail(registrationRes.getError());
    }

    // 5. Update Applicant Status
    return await this.updateResult(id, {
      status: ApplicantStatus.SUBMITTED,
      registrationNumber,
      updatedAt: Date.now(),
    });
  }

  async verifyApplicant(id: string, dto: VerifyApplicantDTO): Promise<Result<Applicant>> {
     const applicantRes = await this.getById(id);
     if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
     if (applicantRes.status !== ApplicantStatus.SUBMITTED && applicantRes.status !== ApplicantStatus.DOCUMENT_REVIEW) {
       return fail(ErrorCodes.VALIDATION_ERROR);
     }

     return await this.updateResult(id, {
       ...dto,
       updatedAt: Date.now(),
     });
  }

  async selectApplicant(id: string, dto: SelectApplicantDTO): Promise<Result<Applicant>> {
     const applicantRes = await this.getById(id);
     if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
     if (applicantRes.status !== ApplicantStatus.VERIFIED) {
       return fail(ErrorCodes.VALIDATION_ERROR);
     }

     return await this.updateResult(id, {
       ...dto,
       updatedAt: Date.now(),
     });
  }
  
  async enrollApplicant(id: string, dto: EnrollApplicantDTO): Promise<Result<Applicant>> {
     const applicantRes = await this.getById(id);
     if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
     if (applicantRes.status !== ApplicantStatus.RE_REGISTRATION && applicantRes.status !== ApplicantStatus.SELECTED) {
       return fail(ErrorCodes.VALIDATION_ERROR);
     }

     return await this.updateResult(id, {
       ...dto,
       updatedAt: Date.now(),
     });
  }
}

export const applicantService = new ApplicantService(applicantRepo);
