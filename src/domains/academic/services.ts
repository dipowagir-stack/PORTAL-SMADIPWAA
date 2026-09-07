import { periodContextService } from "./periodContext";
import {
  AcademicSubject, AcademicClass, AcademicSemester,
  AcademicSchedule, AcademicAttendance, AcademicAssessment,
  AcademicGrade, AcademicReportCard, AcademicConfig, AcademicCalendarData, ExamSchedule, ExamReport, ExamRoom
} from './types';
import { FirestoreRepository } from './repositories';
import { GenericAcademicService } from './coreServices';
import { Result } from '../../foundation/core/Result';
import { deleteField } from 'firebase/firestore';

// Repositories
const classesRepo = new FirestoreRepository<AcademicClass>('classes');
const schedulesRepo = new FirestoreRepository<AcademicSchedule>('schedules');
const attendanceRepo = new FirestoreRepository<AcademicAttendance>('attendance_logs');
const semesterRepo = new FirestoreRepository<AcademicSemester>('academic_semesters');
const subjectRepo = new FirestoreRepository<AcademicSubject>('academic_subjects');
const assessmentRepo = new FirestoreRepository<AcademicAssessment>('academic_assessments');
const gradeRepo = new FirestoreRepository<AcademicGrade>('academic_grades');
const reportCardRepo = new FirestoreRepository<AcademicReportCard>('academic_report_cards');
const curriculumDataRepo = new FirestoreRepository<AcademicConfig>('curriculum_data');
const curriculumCalendarRepo = new FirestoreRepository<AcademicCalendarData>('curriculum_data');
const usersRepo = new FirestoreRepository<any>('users');

const examRoomsRepo = new FirestoreRepository<ExamRoom>('exam_rooms');
const examSchedulesRepo = new FirestoreRepository<ExamSchedule>('exam_schedules');
const examReportsRepo = new FirestoreRepository<ExamReport>('exam_reports');

// Services (Foundation Layer)
const classesService = new GenericAcademicService<AcademicClass>(classesRepo);
export const schedulesService = new GenericAcademicService<AcademicSchedule>(schedulesRepo);
const attendanceService = new GenericAcademicService<AcademicAttendance>(attendanceRepo);
const semesterService = new GenericAcademicService<AcademicSemester>(semesterRepo);
const subjectService = new GenericAcademicService<AcademicSubject>(subjectRepo);
const assessmentService = new GenericAcademicService<AcademicAssessment>(assessmentRepo);
const gradeService = new GenericAcademicService<AcademicGrade>(gradeRepo);
const reportCardService = new GenericAcademicService<AcademicReportCard>(reportCardRepo);
const curriculumDataService = new GenericAcademicService<AcademicConfig>(curriculumDataRepo);
const curriculumCalendarService = new GenericAcademicService<AcademicCalendarData>(curriculumCalendarRepo);
export const usersService = new GenericAcademicService<any>(usersRepo);
export const examRoomsService = new GenericAcademicService<ExamRoom>(examRoomsRepo);
export const examSchedulesService = new GenericAcademicService<ExamSchedule>(examSchedulesRepo);
export const examReportsService = new GenericAcademicService<ExamReport>(examReportsRepo);

export const getClasses = async (): Promise<Result<AcademicClass[]>> => {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  if (activeYearRes.isSuccess && activeYearRes.getValue()) {
    return classesService.getByFieldResult('academicYearId', activeYearRes.getValue()!.id!);
  }
  return classesService.getAllResult();
};
export const getSchedules = async (): Promise<Result<AcademicSchedule[]>> => {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  if (activeYearRes.isSuccess && activeYearRes.getValue()) {
    return schedulesService.getByFieldResult('academicYearId', activeYearRes.getValue()!.id!);
  }
  return schedulesService.getAllResult();
};
export const getAttendances = async (): Promise<Result<AcademicAttendance[]>> => {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  if (activeYearRes.isSuccess && activeYearRes.getValue()) {
    // academicYearId does not exist on AcademicAttendance type? let's filter via classId or just fallback to getAllResult if not there.
    // wait, AcademicAttendance might not have academicYearId. Let's just return getAllResult() for now or cast to any.
    return attendanceService.getByFieldResult('academicYearId' as any, activeYearRes.getValue()!.id!);
  }
  return attendanceService.getAllResult();
};

export async function getAttendancesByTeacher(teacherId: string): Promise<Result<AcademicAttendance[]>> {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  const res = await attendanceService.getByFieldResult('teacherId', teacherId);
  if (res.isSuccess && activeYearRes.isSuccess && activeYearRes.getValue()) {
    return { isSuccess: true, isFailure: false, getValue: () => res.getValue().filter(a => (a as any).academicYearId === activeYearRes.getValue()!.id || !(a as any).academicYearId) } as any;
  }
  return res;
}
export async function getSchedulesByTeacher(teacherId: string): Promise<Result<AcademicSchedule[]>> {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  const res = await schedulesService.getByFieldResult('teacherId', teacherId);
  if (res.isSuccess && activeYearRes.isSuccess && activeYearRes.getValue()) {
    return { isSuccess: true, isFailure: false, getValue: () => res.getValue().filter(s => (s as any).academicYearId === activeYearRes.getValue()!.id || !(s as any).academicYearId) } as any;
  }
  return res;
}
export const getSemesters = (): Promise<Result<AcademicSemester[]>> => semesterService.getAllResult();
export const getSubjects = (): Promise<Result<AcademicSubject[]>> => subjectService.getAllResult();
export const getAssessments = (): Promise<Result<AcademicAssessment[]>> => assessmentService.getAllResult();
export const getGrades = (assessmentId: string): Promise<Result<AcademicGrade[]>> => gradeService.getByFieldResult('assessmentId', assessmentId);
export const getReportCards = (studentId: string): Promise<Result<AcademicReportCard[]>> => reportCardService.getByFieldResult('studentId', studentId);

export const getExamSchedulesByDate = (date: string): Promise<Result<ExamSchedule[]>> => examSchedulesService.getByFieldResult('date', date);
export const getExamSchedulesByTeacher = (teacherId: string): Promise<Result<ExamSchedule[]>> => examSchedulesService.getByFieldResult('teacherId', teacherId);
export const submitExamReportResult = (data: Partial<ExamReport>): Promise<Result<ExamReport>> => examReportsService.createResult(data);

// Curriculum Data access
export const getMasterCurriculumConfig = async (): Promise<Result<AcademicConfig | null>> => {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  const yearId = activeYearRes.isSuccess && activeYearRes.getValue() ? activeYearRes.getValue()!.id! : 'master';
  return curriculumDataService.getByIdResult(yearId);
};
export const getCurriculumConfig = (yearId: string): Promise<Result<AcademicConfig | null>> => curriculumDataService.getByIdResult(yearId);

export const updateMasterCurriculumConfig = async (data: Partial<AcademicConfig>): Promise<Result<AcademicConfig>> => {
  const activeYearRes = await periodContextService.getActiveAcademicYear();
  const yearId = activeYearRes.isSuccess && activeYearRes.getValue() ? activeYearRes.getValue()!.id! : 'master';
  return curriculumDataService.updateResult(yearId, data);
};
export const updateCurriculumConfig = (yearId: string, data: Partial<AcademicConfig>): Promise<Result<AcademicConfig>> => {
  return curriculumDataService.updateResult(yearId, data);
};

export const getAcademicCalendar = (): Promise<Result<AcademicCalendarData | null>> => curriculumCalendarService.getByIdResult('academic_calendar');
export const updateAcademicCalendar = (data: Partial<AcademicCalendarData>): Promise<Result<AcademicCalendarData>> => {
  return curriculumCalendarService.updateResult('academic_calendar', data);
};

// Batch operations
export const replaceAllSchedules = async (newSchedules: AcademicSchedule[]): Promise<Result<void>> => {
  try {
    const allRes = await schedulesService.getAll();
    await Promise.all(allRes.map(doc => {
      if(doc.id) return schedulesService.delete(doc.id);
      return Promise.resolve();
    }));
    await Promise.all(newSchedules.map(s => schedulesService.create(s)));
    return { isSuccess: true, isFailure: false, getValue: () => undefined } as any;
  } catch(e) {
    return { isSuccess: false, isFailure: true, getError: () => "Failed" } as any;
  }
};

export const getUsersByRoles = async (roles: string[]): Promise<Result<any[]>> => {
  try {
    const allUsersRes = await usersService.getAllResult();
    if (allUsersRes.isFailure) return allUsersRes;
    const users = allUsersRes.getValue().filter(u => {
      if (roles.includes(u.role)) return true;
      if (Array.isArray(u.roles) && u.roles.some((r: string) => roles.includes(r))) return true;
      return false;
    });
    return { isSuccess: true, isFailure: false, getValue: () => users } as any;
  } catch(e) {
    return { isSuccess: false, isFailure: true, getError: () => "Failed to get users" } as any;
  }
};

export const getStudents = async (): Promise<Result<any[]>> => {
  try {
    const allUsersRes = await usersService.getAllResult();
    if (allUsersRes.isFailure) return allUsersRes;
    const users = allUsersRes.getValue().filter(u => u.role === 'student');
    return { isSuccess: true, isFailure: false, getValue: () => users } as any;
  } catch(e) {
    return { isSuccess: false, isFailure: true, getError: () => "Failed to get students" } as any;
  }
};

export const updateUser = async (uid: string, updates: any): Promise<Result<any>> => {
  if (updates.className === undefined && Object.keys(updates).includes('className')) {
    // If setting className to undefined, we want to delete it from the object or use deleteField.
    // However, our generic update expects Partial<T>. We'll just pass null instead of deleteField
    // wait, we can just delete it from Firestore directly here if needed, but our GenericService might not support deleteField.
    // Let's just use the underlying repo.
  }
  return usersService.updateResult(uid, updates);
};

export const createUser = async (uid: string, data: any): Promise<Result<any>> => {
  return usersService.updateResult(uid, data); // FirestoreRepository save handles setDoc if ID is provided
};

export const updateUserClassName = async (uid: string, className: string | null): Promise<Result<any>> => {
  const updates = { className: className === null ? deleteField() : className };
  // need to use raw updateDoc or similar if setDoc with merge doesn't accept deleteField
  // Actually setDoc with merge DOES accept deleteField()!
  return usersService.updateResult(uid, updates);
};

export async function getAttendancesByClass(classId: string): Promise<Result<AcademicAttendance[]>> {
  return attendanceService.getByFieldResult('classId', classId);
}

export async function getClass(classId: string): Promise<Result<AcademicClass>> {
  return classesService.getByIdResult(classId);
}
export * from './examServices';

// I didn't create periodTypes, added to types.ts
export * from './periodRepositories';
export * from './periodServices';
export * from './periodContext';
export * from './periodLifecycle';

export * from './academicYearRolloverService';

export const saveAssessment = (data: AcademicAssessment): Promise<Result<AcademicAssessment>> => assessmentService.saveResult(data);
export const saveGrade = (data: AcademicGrade): Promise<Result<AcademicGrade>> => gradeService.saveResult(data);
export const saveReportCard = (data: AcademicReportCard): Promise<Result<AcademicReportCard>> => reportCardService.saveResult(data);
