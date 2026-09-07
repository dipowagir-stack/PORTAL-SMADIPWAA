import { ok, fail, Result } from '../../foundation/core/Result';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { StudentEnrollment, StudentAcademicProfile } from './types';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export interface PromotionPreview {
  studentId: string;
  studentName: string;
  currentClassId: string;
  currentClassName: string;
  currentEnrollmentId: string;
  proposedClassId?: string;
  proposedClassName?: string;
  status: 'READY' | 'PROMOTED' | 'RETAINED' | 'GRADUATED' | 'BLOCKED' | 'MANUAL_REVIEW';
  reason?: string;
}

export interface PromotionExecutePayload {
  studentId: string;
  currentEnrollmentId: string;
  action: 'PROMOTE' | 'RETAIN' | 'GRADUATE';
  targetClassId?: string;
  targetClassName?: string;
  reason?: string;
}

export interface BatchPromotionResult {
  batchId: string;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  failedStudents: { studentId: string; reason: string }[];
}

export class StudentPromotionService {
  /**
   * Generates a preview for student promotion based on the given academic year and class mappings
   */
  async generatePromotionPreview(
    sourceAcademicYearId: string,
    sourceSemester: number,
    classMappings: Record<string, { targetClassId: string; targetClassName: string }>
  ): Promise<Result<PromotionPreview[]>> {
    try {
      let enrollments: StudentEnrollment[] = [];
      if (virtualDatabase.isActive()) {
        const items = await virtualDatabase.getDocs('student_enrollments', item =>
          item.academicYear === sourceAcademicYearId && item.semester === sourceSemester
        );
        enrollments = items.map(d => ({ id: d.id, ...d } as StudentEnrollment));
      } else {
        const q = query(
          collection(db, 'student_enrollments'),
          where('academicYear', '==', sourceAcademicYearId),
          where('semester', '==', sourceSemester)
        );
        const snap = await getDocs(q);
        enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentEnrollment));
      }

      const previews: PromotionPreview[] = [];

      for (const enr of enrollments) {
        let status: PromotionPreview['status'] = 'MANUAL_REVIEW';
        let proposedClassId: string | undefined;
        let proposedClassName: string | undefined;
        let reason: string | undefined;

        if (classMappings[enr.classId]) {
          proposedClassId = classMappings[enr.classId].targetClassId;
          proposedClassName = classMappings[enr.classId].targetClassName;
          
          if (proposedClassName === 'LULUS' || proposedClassName === 'GRADUATE') {
             status = 'GRADUATED';
             reason = 'Siswa mencapai tingkat akhir.';
          } else if (proposedClassId === enr.classId) {
             status = 'RETAINED';
             reason = 'Tinggal di kelas yang sama.';
          } else {
             status = 'READY';
             reason = 'Memenuhi syarat naik kelas.';
          }
        } else {
          status = 'MANUAL_REVIEW';
          reason = 'Mapping kelas tidak ditemukan.';
        }

        let studentName = enr.fullName || 'Unknown Student';
        if (!enr.fullName) {
          if (virtualDatabase.isActive()) {
            const userDoc = await virtualDatabase.getDoc('users', enr.userId);
            if (userDoc) {
              studentName = userDoc.name || studentName;
            }
          } else {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', enr.userId)));
            if (!userDoc.empty) {
              studentName = userDoc.docs[0].data().name || studentName;
            }
          }
        }

        previews.push({
          studentId: enr.userId,
          studentName,
          currentClassId: enr.classId,
          currentClassName: enr.classId,
          currentEnrollmentId: enr.id!,
          proposedClassId,
          proposedClassName,
          status,
          reason,
        });
      }

      return ok(previews);
    } catch (error: any) {
      console.error('Error generating promotion preview:', error);
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Executes a batch of student promotions
   */
  async executePromotionBatch(
    payloads: PromotionExecutePayload[],
    targetAcademicYear: string,
    targetSemester: number,
    actorId: string
  ): Promise<Result<BatchPromotionResult>> {
    try {
      const batchId = `PROM-${Date.now()}`;
      let totalSuccess = 0;
      let totalFailed = 0;
      const failedStudents: { studentId: string; reason: string }[] = [];

      if (virtualDatabase.isActive()) {
        for (const payload of payloads) {
          try {
            if (payload.action === 'GRADUATE') {
              const profileItems = await virtualDatabase.getDocs('student_academic_profiles', item => item.userId === payload.studentId);
              if (profileItems.length > 0) {
                await virtualDatabase.updateDoc('student_academic_profiles', profileItems[0].id, {
                  status: 'graduated',
                  updatedAt: Date.now()
                });
              } else {
                await virtualDatabase.addDoc('student_academic_profiles', {
                  userId: payload.studentId,
                  status: 'graduated',
                  updatedAt: Date.now()
                });
              }
              await virtualDatabase.updateDoc('users', payload.studentId, { status: 'graduated', updatedAt: Date.now() });
            } else if (payload.action === 'PROMOTE' || payload.action === 'RETAIN') {
              if (!payload.targetClassId) throw new Error('Target class is required for PROMOTE/RETAIN');

              const dupItems = await virtualDatabase.getDocs('student_enrollments', item =>
                item.userId === payload.studentId &&
                item.academicYear === targetAcademicYear &&
                item.semester === targetSemester
              );

              if (dupItems.length > 0) {
                failedStudents.push({ studentId: payload.studentId, reason: 'Duplicate enrollment found' });
                totalFailed++;
                continue;
              }

              await virtualDatabase.addDoc('student_enrollments', {
                userId: payload.studentId,
                classId: payload.targetClassId,
                academicYear: targetAcademicYear,
                semester: targetSemester,
                enrolledAt: Date.now()
              });

              await virtualDatabase.updateDoc('users', payload.studentId, { 
                classId: payload.targetClassId, 
                className: payload.targetClassName || payload.targetClassId 
              });
            }

            await virtualDatabase.addDoc('promotion_audits', {
              batchId,
              studentId: payload.studentId,
              action: payload.action,
              targetAcademicYear,
              targetSemester,
              targetClassId: payload.targetClassId,
              actorId,
              reason: payload.reason,
              timestamp: Date.now()
            });

            totalSuccess++;
          } catch (err: any) {
            failedStudents.push({ studentId: payload.studentId, reason: err.message || 'Unknown error' });
            totalFailed++;
          }
        }

        return ok({
          batchId,
          totalProcessed: payloads.length,
          totalSuccess,
          totalFailed,
          failedStudents
        });
      }

      const batch = writeBatch(db);

      for (const payload of payloads) {
        try {
          if (payload.action === 'GRADUATE') {
            const profileQ = query(collection(db, 'student_academic_profiles'), where('userId', '==', payload.studentId));
            const profileSnap = await getDocs(profileQ);
            
            if (!profileSnap.empty) {
              const profileRef = doc(db, 'student_academic_profiles', profileSnap.docs[0].id);
              batch.update(profileRef, {
                status: 'graduated',
                updatedAt: Date.now()
              });
            } else {
              const newProfileRef = doc(collection(db, 'student_academic_profiles'));
              batch.set(newProfileRef, {
                userId: payload.studentId,
                status: 'graduated',
                updatedAt: Date.now()
              });
            }

            const userRef = doc(db, 'users', payload.studentId);
            batch.update(userRef, { status: 'graduated', updatedAt: Date.now() });

          } else if (payload.action === 'PROMOTE' || payload.action === 'RETAIN') {
             if (!payload.targetClassId) throw new Error('Target class is required for PROMOTE/RETAIN');

             const dupQ = query(
               collection(db, 'student_enrollments'), 
               where('userId', '==', payload.studentId),
               where('academicYear', '==', targetAcademicYear),
               where('semester', '==', targetSemester)
             );
             const dupSnap = await getDocs(dupQ);

             if (!dupSnap.empty) {
                failedStudents.push({ studentId: payload.studentId, reason: 'Duplicate enrollment found' });
                totalFailed++;
                continue;
              }

             const newEnrollmentRef = doc(collection(db, 'student_enrollments'));
             const enrollmentData: StudentEnrollment = {
                userId: payload.studentId,
                classId: payload.targetClassId,
                academicYear: targetAcademicYear,
                semester: targetSemester,
                enrolledAt: Date.now()
             };
             batch.set(newEnrollmentRef, enrollmentData);
             
             const userRef = doc(db, 'users', payload.studentId);
             batch.update(userRef, { classId: payload.targetClassId, className: payload.targetClassName || payload.targetClassId });
          }

          const auditRef = doc(collection(db, 'promotion_audits'));
          batch.set(auditRef, {
            batchId,
            studentId: payload.studentId,
            action: payload.action,
            targetAcademicYear,
            targetSemester,
            targetClassId: payload.targetClassId,
            actorId,
            reason: payload.reason,
            timestamp: Date.now()
          });

          totalSuccess++;
        } catch (err: any) {
          failedStudents.push({ studentId: payload.studentId, reason: err.message || 'Unknown error' });
          totalFailed++;
        }
      }

      await batch.commit();

      return ok({
        batchId,
        totalProcessed: payloads.length,
        totalSuccess,
        totalFailed,
        failedStudents
      });
    } catch (error: any) {
      console.error('Error executing promotion batch:', error);
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}

export const studentPromotionService = new StudentPromotionService();
