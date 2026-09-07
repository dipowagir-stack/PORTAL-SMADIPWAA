export * from '../entities';

export interface AdmissionQueryFilters {
  academicYear?: string;
  waveId?: string;
  status?: string;
  applicantType?: string;
}
