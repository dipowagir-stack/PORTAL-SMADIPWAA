import { periodContextService } from "../academic/periodContext";
import { ok, fail, Result } from '../../foundation/core/Result';
import {
  TeacherProfile, TeacherEmployment, TeacherCertification,
  TeacherTeachingLoad, TeacherSchedule, TeacherAttendance,
  TeacherPerformance, TeacherResearch, TeacherTraining, TeacherDocument
} from './types';
import { FirestoreRepository } from './repositories';
import { GenericTeacherService } from './coreServices';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';

// Repositories
const profileRepo = new FirestoreRepository<TeacherProfile>('teacher_profiles');
const employmentRepo = new FirestoreRepository<TeacherEmployment>('teacher_employments');
const certificationRepo = new FirestoreRepository<TeacherCertification>('teacher_certifications');
const teachingLoadRepo = new FirestoreRepository<TeacherTeachingLoad>('teacher_teaching_loads');
const scheduleRepo = new FirestoreRepository<TeacherSchedule>('teacher_schedules');
const attendanceRepo = new FirestoreRepository<TeacherAttendance>('teacher_attendances');
const performanceRepo = new FirestoreRepository<TeacherPerformance>('teacher_performances');
const researchRepo = new FirestoreRepository<TeacherResearch>('teacher_researches');
const trainingRepo = new FirestoreRepository<TeacherTraining>('teacher_trainings');
const documentRepo = new FirestoreRepository<TeacherDocument>('teacher_documents_v2');

// Services (Foundation Layer)
const profileService = new GenericTeacherService<TeacherProfile>(profileRepo);
const employmentService = new GenericTeacherService<TeacherEmployment>(employmentRepo);
const certificationService = new GenericTeacherService<TeacherCertification>(certificationRepo);
const teachingLoadService = new GenericTeacherService<TeacherTeachingLoad>(teachingLoadRepo);
const scheduleService = new GenericTeacherService<TeacherSchedule>(scheduleRepo);
const attendanceService = new GenericTeacherService<TeacherAttendance>(attendanceRepo);
const performanceService = new GenericTeacherService<TeacherPerformance>(performanceRepo);
const researchService = new GenericTeacherService<TeacherResearch>(researchRepo);
const trainingService = new GenericTeacherService<TeacherTraining>(trainingRepo);
const documentService = new GenericTeacherService<TeacherDocument>(documentRepo);

// Helper to unwrap Result<T> to keep backward compatibility

// ============================================================================
// Core Profiles
// ============================================================================

export async function getTeacherProfile(userId: string): Promise<Result<TeacherProfile>> {
  const res = await profileService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

export async function upsertTeacherProfile(userId: string, data: Partial<TeacherProfile>): Promise<Result<TeacherProfile>> {
  const existingRes = await getTeacherProfile(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return profileService.updateResult(existing.id!, { ...data, updatedAt: Date.now() });
  } else {
    return profileService.createResult({ ...data, userId, updatedAt: Date.now() });
  }
}

export async function getTeacherEmployment(userId: string): Promise<Result<TeacherEmployment>> {
  const res = await employmentService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

export async function upsertTeacherEmployment(userId: string, data: Partial<TeacherEmployment>): Promise<Result<TeacherEmployment>> {
  const existingRes = await getTeacherEmployment(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return employmentService.updateResult(existing.id!, { ...data, updatedAt: Date.now() });
  } else {
    return employmentService.createResult({ ...data, userId, updatedAt: Date.now() });
  }
}

// ============================================================================
// Multi-record Collections
// ============================================================================

export const getCertifications = async (userId: string): Promise<Result<TeacherCertification[]>> => {
  return certificationService.getByFieldResult('userId', userId);
};
export const getTeachingLoads = async (userId: string): Promise<Result<TeacherTeachingLoad[]>> => {
  return teachingLoadService.getByFieldResult('userId', userId);
};
export const getSchedules = async (userId: string): Promise<Result<TeacherSchedule[]>> => {
  return scheduleService.getByFieldResult('userId', userId);
};
export const getAttendances = async (userId: string): Promise<Result<TeacherAttendance[]>> => {
  return attendanceService.getByFieldResult('userId', userId);
};
export const getPerformances = async (userId: string): Promise<Result<TeacherPerformance[]>> => {
  return performanceService.getByFieldResult('userId', userId);
};
export const getResearches = async (userId: string): Promise<Result<TeacherResearch[]>> => {
  return researchService.getByFieldResult('userId', userId);
};
export const getTrainings = async (userId: string): Promise<Result<TeacherTraining[]>> => {
  return trainingService.getByFieldResult('userId', userId);
};
export const getDocuments = async (userId: string): Promise<Result<TeacherDocument[]>> => {
  return documentService.getByFieldResult('userId', userId);
};

// ============================================================================
// Facade Methods for UI Migration (Returns Result<T>)

import { customRepo } from './repositories';
import { isAcademicFrozen } from '../academic/freezeService';

export const getTeacherSchedulesResult = async (teacherId: string) => {
  try {
    const { schedulesService } = await import('../academic/services');
    const activeYearRes = await periodContextService.getActiveAcademicYear();
    const res = await schedulesService.getByFieldResult('teacherId', teacherId);
    if (res.isSuccess && activeYearRes.isSuccess && activeYearRes.getValue()) {
      return { isSuccess: true, isFailure: false, getValue: () => res.getValue().filter((s: any) => s.academicYearId === activeYearRes.getValue()!.id || !s.academicYearId) } as any;
    }
    return res;
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getTeacherAttendanceLogsResult = async (teacherId: string) => {
  try {
    const res = await customRepo.getByQueryDesc('attendance_logs', 'teacherId', '==', teacherId, 'date');
    return ok(res);
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getStudentsByClassResult = async (className: string) => {
  try {
    const { usersService } = await import('../academic/services');
    const res = await usersService.getByFieldResult('className', className);
    if (res.isFailure) return fail(res.getError());
    const allUsers = res.getValue();
    return ok(allUsers.filter((u: any) => u.role === 'student'));
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const submitStudentAttendanceResult = async (attendanceData: any) => {
  try {
    if (await isAcademicFrozen()) return fail('ACTION_REJECTED_FROZEN');
    const logId = await customRepo.submitAttendanceBatch('attendance_logs', attendanceData);
    return ok(logId);
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getTeacherDocumentsResult = async (teacherId: string) => {
  try {
    const { FirestoreRepository } = await import('./repositories');
    const repo = new FirestoreRepository<any>('teacher_documents');
    const res = await repo.findByQuery('teacherId', '==', teacherId);
    return ok(res);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const saveTeacherDocumentResult = async (docData: any) => {
  try {
    const { FirestoreRepository } = await import('./repositories');
    const repo = new FirestoreRepository<any>('teacher_documents');
    const res = await repo.save(docData);
    return ok(res);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const deleteTeacherDocumentResult = async (docId: string) => {
  try {
    const { FirestoreRepository } = await import('./repositories');
    const repo = new FirestoreRepository<any>('teacher_documents');
    await repo.delete(docId);
    return ok(undefined);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getTeacherToolsResult = async () => {
  try {
    const res = await customRepo.getAllDesc('teacher_tools', 'createdAt');
    return ok(res);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getAllTeachersResult = async () => {
  try {
    const { usersService } = await import('../academic/services');
    return await usersService.getByFieldResult('role', 'teacher');
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getSchedulesByDayResult = async (dayIndex: number) => {
  try {
    const { schedulesService } = await import('../academic/services');
    return await schedulesService.getByFieldResult('dayIndex', dayIndex);
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const submitPiketAttendanceResult = async (piketData: any) => {
  try {
    const logId = await customRepo.submitAttendanceBatch('piket_logs', piketData);
    return ok(logId);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getCurriculumMasterResult = async () => {
  try {
    const { FirestoreRepository } = await import('./repositories');
    const curriculumRepo = new FirestoreRepository<any>('curriculum_data');
    const data = await curriculumRepo.findById('master');
    if (data) {
       return ok(data);
    }
    return fail(ErrorCodes.NOT_FOUND);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const updateTeacherProfileResult = async (teacherId: string, updates: any) => {
  try {
    const { usersService } = await import('../academic/services');
    return await usersService.updateResult(teacherId, updates);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getTeacherProfileDataResult = async (teacherId: string) => {
  try {
    const { usersService } = await import('../academic/services');
    return await usersService.getByIdResult(teacherId);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getLastSessionResult = async (teacherId: string, className: string, subject: string) => {
  try {
    const res = await customRepo.getByQueryDesc('attendance_logs', 'teacherId', '==', teacherId, 'createdAt');
    // filter by className and subject
    const filtered = res.filter((l: any) => l.className === className && l.subject === subject);
    if (filtered.length > 0) return ok(filtered[0]);
    return ok(null);
  } catch (e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const getTeacherExamSchedulesResult = async (teacherId: string) => {
  try {
    const { examSchedulesService } = await import('../academic/services');
    return await examSchedulesService.getByFieldResult('supervisorId', teacherId);
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};

export const submitExamReportResult = async (reportData: any) => {
  try {
    if (await isAcademicFrozen()) return fail('ACTION_REJECTED_FROZEN');
    const { examReportsService } = await import('../academic/services');
    return await examReportsService.createResult(reportData);
  } catch(e) {
    return fail(ErrorCodes.DATABASE_ERROR);
  }
};
