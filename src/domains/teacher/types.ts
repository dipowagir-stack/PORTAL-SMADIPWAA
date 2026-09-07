export type EmploymentStatus = 'pns' | 'pppk' | 'gty' | 'gtt' | 'honorer';

export interface TeacherProfile {
  id?: string;
  userId: string;
  nuptk?: string;
  nip?: string;
  nik?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  gender?: 'L' | 'P';
  religion?: string;
  address?: string;
  phone?: string;
  updatedAt: number;
}

export interface TeacherEmployment {
  id?: string;
  userId: string;
  status: EmploymentStatus;
  joinDate: string;
  institution: string;
  skNumber?: string;
  skDate?: string;
  updatedAt: number;
}

export interface TeacherCertification {
  id?: string;
  userId: string;
  certificateNumber: string;
  subject: string;
  year: string;
  provider: string;
  status: 'active' | 'expired' | 'revoked';
  updatedAt: number;
}

export interface TeacherTeachingLoad {
  id?: string;
  userId: string;
  academicYear: string;
  semester: number;
  subject: string;
  className: string;
  hoursPerWeek: number;
  updatedAt: number;
}

export interface TeacherSchedule {
  id?: string;
  userId: string;
  academicYear: string;
  semester: number;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  className: string;
  updatedAt: number;
}

export interface TeacherAttendance {
  id?: string;
  userId: string;
  date: string;
  status: 'present' | 'absent' | 'sick' | 'leave';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  updatedAt: number;
}

export interface TeacherPerformance {
  id?: string;
  userId: string;
  academicYear: string;
  semester: number;
  score: number;
  evaluator: string;
  comments: string;
  updatedAt: number;
}

export interface TeacherResearch {
  id?: string;
  userId: string;
  title: string;
  year: string;
  publication?: string;
  role: 'author' | 'co_author' | 'researcher';
  url?: string;
  updatedAt: number;
}

export interface TeacherTraining {
  id?: string;
  userId: string;
  title: string;
  organizer: string;
  year: string;
  durationHours: number;
  certificateUrl?: string;
  updatedAt: number;
}

export interface TeacherDocument {
  id?: string;
  userId: string;
  type: 'ktp' | 'ijazah' | 'sk' | 'sertifikat' | 'other';
  title: string;
  url: string;
  verified: boolean;
  uploadedAt: number;
}
