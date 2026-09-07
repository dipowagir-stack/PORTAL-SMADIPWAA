import { isNotEmptyString, isEmailValid } from '../../../foundation/shared/Validators';
import { CreateApplicantDTO, CreateAdmissionWaveDTO } from '../dto';

export const isValidNationalId = (nationalId: string): boolean => {
  return isNotEmptyString(nationalId) && nationalId.length >= 10 && /^\d+$/.test(nationalId);
};

export const isValidPhone = (phone: string): boolean => {
  return isNotEmptyString(phone) && phone.length >= 10 && /^[\d\+\-\s]+$/.test(phone);
};

export const isValidBirthDate = (date: string): boolean => {
  return isNotEmptyString(date) && /^\d{4}-\d{2}-\d{2}$/.test(date);
};

export const isValidAcademicYear = (year: string): boolean => {
  return isNotEmptyString(year) && /^\d{4}\/\d{4}$/.test(year); // e.g., "2024/2025"
};

export const validateCreateApplicant = (dto: CreateApplicantDTO): string[] => {
  const errors: string[] = [];

  if (!isNotEmptyString(dto.fullName)) errors.push('Full name is required');
  if (!isValidNationalId(dto.nationalId)) errors.push('Invalid national ID format');
  if (!isEmailValid(dto.email)) errors.push('Invalid email format');
  if (!isValidPhone(dto.phone)) errors.push('Invalid phone number format');
  if (!isValidBirthDate(dto.birthDate)) errors.push('Invalid birth date format (YYYY-MM-DD)');
  if (!isValidAcademicYear(dto.academicYear)) errors.push('Invalid academic year format (YYYY/YYYY)');
  if (!isNotEmptyString(dto.waveId)) errors.push('Admission wave is required');
  if (!isNotEmptyString(dto.applicantType)) errors.push('Applicant type is required');

  return errors;
};

export const validateCreateWave = (dto: CreateAdmissionWaveDTO): string[] => {
  const errors: string[] = [];

  if (!isNotEmptyString(dto.name)) errors.push('Wave name is required');
  if (!isValidAcademicYear(dto.academicYear)) errors.push('Invalid academic year format');
  if (dto.startDate >= dto.endDate) errors.push('Start date must be before end date');
  if (dto.quota <= 0) errors.push('Quota must be greater than zero');

  return errors;
};
