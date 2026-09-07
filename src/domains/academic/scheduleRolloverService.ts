import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../../foundation/core/Result';
import { TeacherTeachingLoad, TeacherSchedule } from '../teacher/types';
import { AcademicClass, AcademicSubject, AcademicSemesterMaster } from './types';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export interface AssignmentRolloverPreview {
  id: string; // original load id
  teacherId: string;
  subject: string;
  className: string;
  hoursPerWeek: number;
  status: 'CARRY_FORWARD' | 'MODIFY' | 'REMOVE' | 'NEW_ASSIGNMENT' | 'MANUAL_REVIEW' | 'BLOCKED';
  warningMessage?: string;
}

export interface ScheduleRolloverPreview {
  id: string; // original schedule id
  teacherId: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  className: string;
  status: 'READY' | 'CONFLICT' | 'BLOCKED';
  conflicts?: string[];
}

export class ScheduleRolloverService {
  async getPreviousAssignments(academicYear: string, semester: number): Promise<Result<TeacherTeachingLoad[]>> {
    try {
      if (virtualDatabase.isActive()) {
        const items = await virtualDatabase.getDocs('teacher_teaching_loads', item => 
          item.academicYear === academicYear && item.semester === semester
        );
        return ok(items as TeacherTeachingLoad[]);
      }
      const q = query(
        collection(db, 'teacher_teaching_loads'),
        where('academicYear', '==', academicYear),
        where('semester', '==', semester)
      );
      const snapshot = await getDocs(q);
      const loads = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TeacherTeachingLoad));
      return ok(loads);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async generateAssignmentPreview(
    sourceYear: string, 
    sourceSemester: number, 
    targetYear: string, 
    targetSemester: number
  ): Promise<Result<AssignmentRolloverPreview[]>> {
    try {
      // 1. Get Source Assignments
      const sourceRes = await this.getPreviousAssignments(sourceYear, sourceSemester);
      if (!sourceRes.isSuccess) return fail((sourceRes as any).getError());
      const sourceLoads = sourceRes.getValue()!;

      // 2. Load Target Classes and Subjects to validate
      let classes: string[] = [];
      let subjects: string[] = [];

      if (virtualDatabase.isActive()) {
        const classesItems = await virtualDatabase.getDocs('academic_classes');
        classes = classesItems.map(d => d.name);
        const subjectsItems = await virtualDatabase.getDocs('academic_subjects');
        subjects = subjectsItems.map(d => d.name);
      } else {
        const classesRes = await getDocs(collection(db, 'academic_classes'));
        classes = classesRes.docs.map(d => d.data().name);
        const subjectsRes = await getDocs(collection(db, 'academic_subjects'));
        subjects = subjectsRes.docs.map(d => d.data().name);
      }

      const previews: AssignmentRolloverPreview[] = sourceLoads.map(load => {
        let status: AssignmentRolloverPreview['status'] = 'CARRY_FORWARD';
        let warningMessage = undefined;

        if (!classes.includes(load.className)) {
          status = 'MANUAL_REVIEW';
          warningMessage = `Class ${load.className} not found in target period`;
        } else if (!subjects.includes(load.subject)) {
          status = 'MANUAL_REVIEW';
          warningMessage = `Subject ${load.subject} not found in target period`;
        }

        return {
          id: load.id!,
          teacherId: load.userId,
          subject: load.subject,
          className: load.className,
          hoursPerWeek: load.hoursPerWeek,
          status,
          warningMessage
        };
      });

      return ok(previews);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async approveAssignments(
    targetYear: string,
    targetSemester: number,
    approvedAssignments: AssignmentRolloverPreview[]
  ): Promise<Result<boolean>> {
    try {
      if (virtualDatabase.isActive()) {
        for (const req of approvedAssignments) {
          if (req.status === 'REMOVE' || req.status === 'BLOCKED') continue;
          await virtualDatabase.addDoc('teacher_teaching_loads', {
            userId: req.teacherId,
            academicYear: targetYear,
            semester: targetSemester,
            subject: req.subject,
            className: req.className,
            hoursPerWeek: req.hoursPerWeek,
            updatedAt: Date.now()
          });
        }
        return ok(true);
      }

      const batch = writeBatch(db);
      
      for (const req of approvedAssignments) {
        if (req.status === 'REMOVE' || req.status === 'BLOCKED') continue;
        
        const docRef = doc(collection(db, 'teacher_teaching_loads'));
        batch.set(docRef, {
          userId: req.teacherId,
          academicYear: targetYear,
          semester: targetSemester,
          subject: req.subject,
          className: req.className,
          hoursPerWeek: req.hoursPerWeek,
          updatedAt: Date.now()
        });
      }

      await batch.commit();
      return ok(true);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async getPreviousSchedules(academicYear: string, semester: number): Promise<Result<TeacherSchedule[]>> {
    try {
      if (virtualDatabase.isActive()) {
        const items = await virtualDatabase.getDocs('teacher_schedules', item => 
          item.academicYear === academicYear && item.semester === semester
        );
        return ok(items as TeacherSchedule[]);
      }
      const q = query(
        collection(db, 'teacher_schedules'),
        where('academicYear', '==', academicYear),
        where('semester', '==', semester)
      );
      const snapshot = await getDocs(q);
      const schedules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TeacherSchedule));
      return ok(schedules);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async generateSchedulePreview(
    sourceYear: string, 
    sourceSemester: number, 
    targetYear: string, 
    targetSemester: number
  ): Promise<Result<ScheduleRolloverPreview[]>> {
    try {
      const sourceRes = await this.getPreviousSchedules(sourceYear, sourceSemester);
      if (!sourceRes.isSuccess) return fail((sourceRes as any).getError());
      const sourceSchedules = sourceRes.getValue()!;

      const previews: ScheduleRolloverPreview[] = sourceSchedules.map(sch => {
        return {
          id: sch.id!,
          teacherId: sch.userId,
          day: sch.day,
          startTime: sch.startTime,
          endTime: sch.endTime,
          subject: sch.subject,
          className: sch.className,
          status: 'READY'
        };
      });

      return ok(previews);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async publishSchedules(
    targetYear: string,
    targetSemester: number,
    approvedSchedules: ScheduleRolloverPreview[]
  ): Promise<Result<boolean>> {
    try {
      if (virtualDatabase.isActive()) {
        for (const req of approvedSchedules) {
          if (req.status !== 'READY') continue;
          await virtualDatabase.addDoc('teacher_schedules', {
            userId: req.teacherId,
            academicYear: targetYear,
            semester: targetSemester,
            day: req.day,
            startTime: req.startTime,
            endTime: req.endTime,
            subject: req.subject,
            className: req.className,
            updatedAt: Date.now()
          });
        }
        return ok(true);
      }

      const batch = writeBatch(db);
      
      for (const req of approvedSchedules) {
        if (req.status !== 'READY') continue;
        
        const docRef = doc(collection(db, 'teacher_schedules'));
        batch.set(docRef, {
          userId: req.teacherId,
          academicYear: targetYear,
          semester: targetSemester,
          day: req.day,
          startTime: req.startTime,
          endTime: req.endTime,
          subject: req.subject,
          className: req.className,
          updatedAt: Date.now()
        });
      }

      await batch.commit();
      return ok(true);
    } catch (e: any) {
      return fail(e.message);
    }
  }
}

export const scheduleRolloverService = new ScheduleRolloverService();
