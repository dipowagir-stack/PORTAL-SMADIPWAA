export interface Parent {
  id?: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}

export type RelationRole = 'Father' | 'Mother' | 'Guardian' | 'Caretaker' | 'Family';

export type ParentAccessLevel = 
  | 'view_only' 
  | 'attendance_read' 
  | 'grade_read' 
  | 'finance_read' 
  | 'document_read' 
  | 'approval_write' 
  | 'communication_write' 
  | 'notification_read';

export interface ParentAccess {
  studentId: string;
  grantedPermissions: ParentAccessLevel[];
}

export interface ParentStudentRelation {
  id?: string;
  parentId: string;
  studentId: string;
  relationRole: RelationRole;
  isPrimary: boolean;
  accessPermissions: ParentAccessLevel[];
  createdAt: number;
}

export interface EmergencyContact {
  id?: string;
  parentId: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

export interface ParentPreference {
  id?: string;
  parentId: string;
  emailNotification: boolean;
  pushNotification: boolean;
  language: string;
}

export interface ParentNotification {
  id?: string;
  parentId: string;
  title: string;
  message: string;
  category: 'Academic' | 'Finance' | 'Attendance' | 'Behavior' | 'Announcement';
  read: boolean;
  createdAt: number;
}

export type ApprovalTargetType = 'Izin' | 'Persetujuan' | 'Konfirmasi Pembayaran' | 'Konfirmasi Dokumen';

export interface ApprovalRecord {
  id?: string;
  parentId: string;
  studentId: string;
  targetType: ApprovalTargetType;
  targetId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
