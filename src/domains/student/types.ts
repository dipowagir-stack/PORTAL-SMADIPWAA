export type EnrollmentStatus = 'active' | 'graduated' | 'dropped_out' | 'suspended';

export interface StudentAcademicProfile {
  id?: string;
  userId: string;
  fullName?: string;
  nis: string;
  nisn: string;
  status: EnrollmentStatus;
  major?: string; // IPA, IPS, dsb.
  entryYear: string;
  updatedAt: number;
}

export interface StudentEnrollment {
  id?: string;
  userId: string;
  fullName?: string;
  classId: string;
  academicYear: string;
  semester: number;
  enrolledAt: number;
}

export interface StudentGuardian {
  id?: string;
  userId: string;
  fullName?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherJob?: string;
  motherName?: string;
  motherPhone?: string;
  motherJob?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  guardianRelation?: string;
  updatedAt: number;
}

export interface StudentHealth {
  id?: string;
  userId: string;
  fullName?: string;
  bloodType?: string;
  height?: number; // in cm
  weight?: number; // in kg
  allergies?: string[];
  medicalHistory?: string;
  updatedAt: number;
}

export interface StudentAchievement {
  id?: string;
  userId: string;
  fullName?: string;
  title: string;
  type: 'academic' | 'non_academic';
  level: 'school' | 'city' | 'province' | 'national' | 'international';
  year: string;
  description?: string;
  proofUrl?: string;
  createdAt: number;
}

export interface StudentViolation {
  id?: string;
  userId: string;
  fullName?: string;
  date: number;
  type: 'minor' | 'moderate' | 'severe';
  points: number;
  description: string;
  status: 'pending' | 'resolved';
  resolvedAt?: number;
  createdAt: number;
}

export interface StudentDocument {
  id?: string;
  userId: string;
  fullName?: string;
  type: 'kk' | 'akta' | 'ijazah' | 'other';
  url: string;
  verified: boolean;
  verifiedAt?: number;
  createdAt: number;
}

export interface StudentExtracurricular {
  id?: string;
  userId: string;
  fullName?: string;
  activityId: string; // reference to master extracurricular
  activityName: string;
  role: string; // member, leader, etc.
  joinDate: number;
  status: 'active' | 'inactive';
}

export interface StudentPortfolio {
  id?: string;
  userId: string;
  fullName?: string;
  title: string;
  description: string;
  link?: string;
  mediaUrls?: string[];
  createdAt: number;
}
