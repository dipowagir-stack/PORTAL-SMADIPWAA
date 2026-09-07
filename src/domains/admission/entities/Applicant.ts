export enum ApplicantStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  DOCUMENT_REVIEW = 'DOCUMENT_REVIEW',
  DOCUMENT_REVISION = 'DOCUMENT_REVISION',
  VERIFIED = 'VERIFIED',
  SELECTED = 'SELECTED',
  NOT_SELECTED = 'NOT_SELECTED',
  WAITLISTED = 'WAITLISTED',
  RE_REGISTRATION = 'RE_REGISTRATION',
  ENROLLED = 'ENROLLED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export interface Applicant {
  id?: string;
  registrationNumber?: string;
  academicYear: string;
  waveId: string;
  status: ApplicantStatus;
  applicantType: string; // e.g., 'REGULAR', 'TRANSFER', 'SCHOLARSHIP'
  fullName: string;
  nationalId: string; // NIK / NISN
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
  religion?: string;
  address: string;
  phone: string;
  email: string;
  
  // Section B: School Origin
  schoolOrigin: string;
  schoolOriginNpsn?: string;
  graduationYear?: string;
  nisn?: string;
  
  // Section C: Academic Program
  program?: string;
  
  createdAt: number;
  updatedAt: number;
  createdBy: string; // Ownership (applicant user ID)

  // System & Admin fields (protected from mass assignment)
  approvedBy?: string;
  selectedBy?: string;
  enrolledBy?: string;
  adminNotes?: string;
  internalNotes?: string;

  // Phase 6: Result & Re-registration
  publishedAt?: number;
  resultPublishedBy?: string;
  reRegistrationStatus?: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  reRegistrationDeadline?: number;
  reRegistrationPaymentStatus?: string; // e.g. 'paid', 'pending', 'waived'
}
