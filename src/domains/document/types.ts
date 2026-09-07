export type DocumentType = 'pdf' | 'photo' | 'certificate' | 'letter' | 'archive' | 'other';
export type DocumentCategory = 'academic' | 'finance' | 'hr' | 'general' | 'admission';
export type DocumentOwnerType = 'school' | 'teacher' | 'student' | 'admin' | 'applicant';

export type DocumentStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED' | 'EXPIRED';

export interface DocumentItem {
  id?: string;
  title: string;
  type: DocumentType;
  category: DocumentCategory;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
  ownerId: string;
  ownerType: DocumentOwnerType;
  isSigned: boolean;
  status?: DocumentStatus;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentTemplate {
  id?: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  type: 'letter' | 'certificate';
  createdAt: number;
  updatedAt: number;
}

export interface DocumentSignature {
  id?: string;
  documentId: string;
  signerId: string;
  signerName: string;
  signedAt: number;
  signatureHash: string;
  status: 'valid' | 'revoked';
}
