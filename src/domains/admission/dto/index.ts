import { Applicant, ApplicantStatus } from '../entities/Applicant';
import { Registration } from '../entities/Registration';
import { AdmissionWave, WaveStatus } from '../entities/AdmissionWave';

export type CreateApplicantDTO = Omit<Applicant, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'approvedBy' | 'selectedBy' | 'enrolledBy' | 'adminNotes' | 'internalNotes' | 'registrationNumber'>;

export type UpdateApplicantDTO = Partial<Omit<Applicant, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'approvedBy' | 'selectedBy' | 'enrolledBy' | 'adminNotes' | 'internalNotes' | 'registrationNumber'>>;

export type VerifyApplicantDTO = {
  status: ApplicantStatus.VERIFIED | ApplicantStatus.DOCUMENT_REVISION;
  approvedBy: string;
  adminNotes?: string;
  internalNotes?: string;
};

export type SelectApplicantDTO = {
  status: ApplicantStatus.SELECTED | ApplicantStatus.NOT_SELECTED | ApplicantStatus.WAITLISTED;
  selectedBy: string;
  internalNotes?: string;
};

export type PublishResultDTO = {
  publishedAt: number;
  resultPublishedBy: string;
  reRegistrationDeadline?: number;
  reRegistrationStatus?: 'PENDING';
};

export type EnrollApplicantDTO = {
  status: ApplicantStatus.ENROLLED;
  enrolledBy: string;
};

export type CreateRegistrationDTO = Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>;

export type CreateAdmissionWaveDTO = Omit<AdmissionWave, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAdmissionWaveDTO = Partial<CreateAdmissionWaveDTO>;
