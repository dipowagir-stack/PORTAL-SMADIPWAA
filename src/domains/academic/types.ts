export interface AcademicSubject {
  id?: string;
  code?: string;
  name: string;
  type?: string;
  createdAt?: number;
}

export interface AcademicClass {
  id?: string;
  name: string;
  grade?: number;
  homeroomTeacherId?: string;
  createdAt?: number;
}

export interface AcademicSemester {
  id?: string;
  year: string;
  type: 'ganjil' | 'genap';
  isActive: boolean;
}

export interface AcademicSchedule {
  id?: string;
  classId?: string;
  className: string;
  subject: string;
  teacherId: string;
  dayIndex: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  semesterId?: string;
}

export interface AcademicAttendance {
  id?: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  pertemuan: number;
  materi: string;
  tanggal: string;
  semesterId?: string;
  createdAt: any;
  stats: {
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
  };
  students: {
    uid: string;
    name: string;
    status: 'hadir' | 'izin' | 'sakit' | 'alpa';
    notes?: string;
  }[];
}

export interface AcademicAssessment {
  id?: string;
  className: string;
  subject: string;
  teacherId: string;
  title: string;
  type: string;
  date: string;
  semesterId?: string;
}

export interface AcademicGrade {
  id?: string;
  studentId: string;
  studentName?: string;
  assessmentId: string;
  score: number;
  feedback?: string;
  semesterId?: string;
}

export interface AcademicReportCard {
  id?: string;
  studentId: string;
  semesterId: string;
  className: string;
  totalScore: number;
  averageScore: number;
  rank?: number;
  status: 'draft' | 'published';
}

export interface AcademicConfig {
  id?: string; // 'master'
  daysPerWeek?: number;
  periodsPerDay?: number;
  classes?: string[];
  homeroomTeachers?: { className: string; teacherId: string; teacherName: string; }[];
  piketTeachers?: { dayIndex: number; teacherId: string; teacherName: string; }[];
  teachingLoads?: { subject: string; class: string; load: number }[];
  startTime?: string;
  periodDuration?: number;
  breakDuration?: number;
  break1AfterPeriod?: number;
  break2AfterPeriod?: number;
  isFridaySpecial?: boolean;
  fridayBreak1AfterPeriod?: number;
  fridayBreak2AfterPeriod?: number;
  isTimeOffSubmissionOpen?: boolean;
  isAcademicFrozen?: boolean;
}

export interface AcademicCalendarData {
  id?: string; // 'academic_calendar'
  academic_calendar: any[];
}


export interface ExamRoom {
  id?: string;
  name: string;
  capacity: number;
  format?: string;
  supervisorPosition?: 'center' | 'left' | 'right';
  doorPosition?: 'back_right' | 'back_left' | 'front_right' | 'front_left';
  numberingFlow?: 'row_z' | 'col_vertical' | 'snake_s';
  layout?: (any | null)[][];
  students: {
    uid: string;
    name: string;
    nisn: string;
    className: string;
    seatNumber?: number;
  }[];
}

export interface ExamSchedule {
  id?: string;
  date: string;
  sessionName?: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectsMapping?: Record<string, string>;
  roomId: string;
  roomName: string;
  supervisorId: string;
  supervisorName: string;
  status: 'draft' | 'published';
  academicYear: string;
  semester: string;
}

export interface ExamReport {
  id?: string;
  examScheduleId: string;
  supervisorId: string;
  roomId: string;
  date: string;
  subject: string;
  attendance: Record<string, string>; // studentId -> status (H/S/I/A)
  notes: string;
  submittedAt: string;
}

export type PeriodState = 'PLANNING' | 'ACTIVE' | 'CLOSING' | 'CLOSED' | 'ARCHIVED';

export interface AcademicYear {
  id?: string;
  name: string;
  startDate: number;
  endDate: number;
  state: PeriodState;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  closedAt?: number;
  closedBy?: string;
}

export interface AcademicSemesterMaster {
  id?: string;
  academicYearId: string;
  type: 'GANJIL' | 'GENAP' | 'ganjil' | 'genap';
  startDate: number;
  endDate: number;
  state: PeriodState;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  closedAt?: number;
  closedBy?: string;
}
