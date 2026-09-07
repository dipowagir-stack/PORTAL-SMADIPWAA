export interface AdmissionDocumentRequirement {
  id?: string;
  waveId: string;
  academicYear: string;
  applicantType?: string; // e.g. "REGULER", if empty applies to all
  documentName: string; // e.g. "Kartu Keluarga", "Ijazah"
  documentCode: string; // e.g. "kk", "ijazah"
  isRequired: boolean;
  maxSizeBytes: number;
  allowedTypes: string[]; // e.g. ['pdf', 'image/jpeg', 'image/png']
  createdAt: number;
  updatedAt: number;
}
