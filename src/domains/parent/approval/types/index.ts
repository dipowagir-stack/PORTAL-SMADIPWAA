export type ApprovalType = 
  | 'Izin_Tidak_Masuk' 
  | 'Izin_Pulang' 
  | 'Permohonan_Pertemuan' 
  | 'Konfirmasi_Pembayaran' 
  | 'Konfirmasi_Dokumen' 
  | 'Persetujuan_Administrasi';

export type ApprovalStatus = 
  | 'Draft' 
  | 'Submitted' 
  | 'Waiting' 
  | 'Approved' 
  | 'Rejected' 
  | 'Cancelled' 
  | 'Expired';

export interface ApprovalTrail {
  action: 'Create' | 'Update' | 'Approve' | 'Reject' | 'Cancel';
  actorId: string;
  actorRole: string;
  timestamp: number;
  notes?: string;
}

export interface ParentApproval {
  id?: string;
  parentId: string;
  studentId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  approverId?: string;       // Person who should approve (e.g., teacher, finance)
  approverRole?: string;
  title: string;
  description: string;
  attachments?: string[];    // Linked to Document module
  threadId?: string;         // Linked to Communication module
  auditTrail: ApprovalTrail[];
  createdAt: number;
  updatedAt: number;
}
