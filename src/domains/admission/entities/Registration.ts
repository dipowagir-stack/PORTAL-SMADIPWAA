export interface Registration {
  id?: string;
  applicantId: string;
  registrationNumber: string;
  academicYear: string;
  waveId: string;
  status: string;
  
  submittedAt?: number;
  createdAt: number;
  updatedAt: number;
}
