export interface StudentSummaryDTO {
  studentId: string;
  fullName: string;
  nis: string;
  className: string;
  status: string;
}

export interface AttendanceSummaryDTO {
  present: number;
  absent: number;
  sick: number;
  leave: number;
  totalMeetings: number;
}

export interface AcademicSummaryDTO {
  currentSemester: string;
  averageGrade: number;
  rank?: number;
}

export interface FinanceSummaryDTO {
  totalUnpaid: number;
  lastPaymentDate?: number;
  status: 'Clear' | 'Has_Arrears';
}

export interface NotificationSummaryDTO {
  id: string;
  title: string;
  date: number;
  type: string;
}

export interface ParentDashboardDTO {
  studentProfile: StudentSummaryDTO;
  attendance: AttendanceSummaryDTO;
  academic: AcademicSummaryDTO;
  finance: FinanceSummaryDTO;
  notifications: NotificationSummaryDTO[];
}
