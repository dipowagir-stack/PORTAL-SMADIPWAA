import { ok, fail, Result } from '../../foundation/core/Result';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  StudentAcademicProfile, StudentEnrollment, StudentGuardian,
  StudentHealth, StudentAchievement, StudentViolation,
  StudentDocument, StudentExtracurricular, StudentPortfolio
} from './types';
import { FirestoreRepository } from './repositories';
import { GenericStudentService } from './coreServices';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

// Repositories
const academicProfileRepo = new FirestoreRepository<StudentAcademicProfile>('student_academic_profiles');
const guardianProfileRepo = new FirestoreRepository<StudentGuardian>('student_guardians');
const healthProfileRepo = new FirestoreRepository<StudentHealth>('student_health');
const enrollmentsRepo = new FirestoreRepository<StudentEnrollment>('student_enrollments');
const achievementsRepo = new FirestoreRepository<StudentAchievement>('student_achievements');
const violationsRepo = new FirestoreRepository<StudentViolation>('student_violations');
const documentsRepo = new FirestoreRepository<StudentDocument>('student_documents');
const extracurricularsRepo = new FirestoreRepository<StudentExtracurricular>('student_extracurriculars');
const portfoliosRepo = new FirestoreRepository<StudentPortfolio>('student_portfolios');

// Services (Foundation Layer)
const academicProfileService = new GenericStudentService<StudentAcademicProfile>(academicProfileRepo);
const guardianProfileService = new GenericStudentService<StudentGuardian>(guardianProfileRepo);
const healthProfileService = new GenericStudentService<StudentHealth>(healthProfileRepo);
const enrollmentsService = new GenericStudentService<StudentEnrollment>(enrollmentsRepo);
const achievementsService = new GenericStudentService<StudentAchievement>(achievementsRepo);
const violationsService = new GenericStudentService<StudentViolation>(violationsRepo);
const documentsService = new GenericStudentService<StudentDocument>(documentsRepo);
const extracurricularsService = new GenericStudentService<StudentExtracurricular>(extracurricularsRepo);
const portfoliosService = new GenericStudentService<StudentPortfolio>(portfoliosRepo);

// ============================================================================
// Core Profiles (Compatibility Layer)
// ============================================================================

export async function getAcademicProfile(userId: string): Promise<Result<StudentAcademicProfile>> {
  const res = await academicProfileService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

export async function upsertAcademicProfile(userId: string, data: Partial<StudentAcademicProfile>): Promise<Result<StudentAcademicProfile>> {
  const existingRes = await getAcademicProfile(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return academicProfileService.updateResult(existing.id!, { ...data, updatedAt: Date.now() });
  } else {
    return academicProfileService.createResult({ ...data, userId, updatedAt: Date.now() });
  }
}

export async function getGuardianProfile(userId: string): Promise<Result<StudentGuardian>> {
  const res = await guardianProfileService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

export async function upsertGuardianProfile(userId: string, data: Partial<StudentGuardian>): Promise<Result<StudentGuardian>> {
  const existingRes = await getGuardianProfile(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return guardianProfileService.updateResult(existing.id!, { ...data, updatedAt: Date.now() });
  } else {
    return guardianProfileService.createResult({ ...data, userId, updatedAt: Date.now() });
  }
}

export async function getHealthProfile(userId: string): Promise<Result<StudentHealth>> {
  const res = await healthProfileService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

export async function upsertHealthProfile(userId: string, data: Partial<StudentHealth>): Promise<Result<StudentHealth>> {
  const existingRes = await getHealthProfile(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return healthProfileService.updateResult(existing.id!, { ...data, updatedAt: Date.now() });
  } else {
    return healthProfileService.createResult({ ...data, userId, updatedAt: Date.now() });
  }
}

// ============================================================================
// Multi-record Collections (Compatibility Layer)
// ============================================================================

export const getEnrollments = async (userId: string): Promise<Result<StudentEnrollment[]>> => {
  return enrollmentsService.getByFieldResult('userId', userId);
};
export const getAchievements = async (userId: string): Promise<Result<StudentAchievement[]>> => {
  return achievementsService.getByFieldResult('userId', userId);
};
export const getViolations = async (userId: string): Promise<Result<StudentViolation[]>> => {
  return violationsService.getByFieldResult('userId', userId);
};
export const getDocuments = async (userId: string): Promise<Result<StudentDocument[]>> => {
  return documentsService.getByFieldResult('userId', userId);
};
export const getExtracurriculars = async (userId: string): Promise<Result<StudentExtracurricular[]>> => {
  return extracurricularsService.getByFieldResult('userId', userId);
};
export const getPortfolios = async (userId: string): Promise<Result<StudentPortfolio[]>> => {
  return portfoliosService.getByFieldResult('userId', userId);
};

// Cross-domain Finance Facade for Student UI
export const getStudentPayments = async (studentId: string) => {
  const { getPaymentsByStudentResult } = await import('../finance/services');
  return getPaymentsByStudentResult(studentId);
};

export const getStudentBillingEvents = async () => {
  const { getBillingEventsResult } = await import('../finance/services');
  return getBillingEventsResult();
};

export const createStudentPayment = async (paymentData: any) => {
  const { createPaymentResult } = await import('../finance/services');
  return createPaymentResult(paymentData);
};

export const deleteStudentPayment = async (paymentId: string) => {
  const { deletePaymentResult } = await import('../finance/services');
  return deletePaymentResult(paymentId);
};

export const updateStudentProfile = async (studentId: string, updates: any) => {
  const { usersService } = await import('../academic/services');
  return usersService.updateResult(studentId, updates);
};

export const getStudentClasses = async () => {
  const { getClasses } = await import('../academic/services');
  return getClasses();
};

export const getStudentSchedulesByClass = async (classId: string) => {
  const { schedulesService } = await import('../academic/services');
  return schedulesService.getByFieldResult('classId', classId);
};

export const getGlobalSettings = async () => {
  const { FirestoreRepository } = await import('./repositories');
  const settingsRepo = new FirestoreRepository<any>('settings');
  try {
    const data = await settingsRepo.findById('global');
    return { isSuccess: true, isFailure: false, getValue: () => data } as any;
  } catch (e) {
    return { isSuccess: false, isFailure: true, getError: () => "Failed" } as any;
  }
};

export const getStudentsByClassIdResult = async (classId: string) => {
  try {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs('users', item => item.role === 'student' && item.classId === classId);
      return ok(items.map(d => ({ id: d.id, ...d })));
    }
    const q = query(collection(db, 'users'), where('role', '==', 'student'), where('classId', '==', classId));
    const snap = await getDocs(q);
    return ok(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export async function getConnectedParents(waParentNumber: string): Promise<any[]> {
  if (!waParentNumber) return [];
  if (virtualDatabase.isActive()) {
    return await virtualDatabase.getDocs('users', item => item.role === 'parent' && item.waNumber === waParentNumber);
  }
  const q = query(collection(db, 'users'), where('role', '==', 'parent'), where('waNumber', '==', waParentNumber));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getOrGenerateParentLinkCode(studentId: string): Promise<string | null> {
  if (virtualDatabase.isActive()) {
    const data = await virtualDatabase.getDoc('users', studentId);
    if (!data) return null;
    if (data.parentLinkCode) return data.parentLinkCode;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await virtualDatabase.updateDoc('users', studentId, { parentLinkCode: code });
    return code;
  }

  const userRef = doc(db, 'users', studentId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.parentLinkCode) return data.parentLinkCode;
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  await updateDoc(userRef, { parentLinkCode: code });
  return code;
}

export async function getStudentIdByLinkCode(code: string): Promise<Result<string>> {
  if (virtualDatabase.isActive()) {
    const items = await virtualDatabase.getDocs('users', item => item.parentLinkCode === code && item.role === 'student');
    if (items.length === 0) {
      return fail('Kode tidak valid atau tidak ditemukan.');
    }
    return ok(items[0].id);
  }
  const q = query(collection(db, 'users'), where('parentLinkCode', '==', code), where('role', '==', 'student'));
  const snap = await getDocs(q);
  if (snap.empty) {
    return fail('Kode tidak valid atau tidak ditemukan.');
  }
  return ok(snap.docs[0].id);
}

export async function getStudentFallbackName(studentId: string): Promise<string> {
  try {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc('users', studentId);
      if (data) return data.name || data.displayName || 'Siswa';
    } else {
      const userSnap = await getDoc(doc(db, 'users', studentId));
      if (userSnap.exists()) {
        const data = userSnap.data();
        return data.name || data.displayName || 'Siswa';
      }
    }
  } catch (e) {
    console.error("Failed to fetch user fallback", e);
  }
  return 'Nama Siswa';
}
