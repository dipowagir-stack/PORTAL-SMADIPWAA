import { AcademicYearRepository, AcademicSemesterRepository } from './periodRepositories';
import { AcademicYear, AcademicSemesterMaster, PeriodState } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

const yearRepo = new AcademicYearRepository();
const semesterRepo = new AcademicSemesterRepository();

export interface PeriodContext {
  academicYear: AcademicYear;
  semester: AcademicSemesterMaster;
  periodId: string;
  startDate: number;
  endDate: number;
}

export class PeriodContextService {
  async getActiveAcademicYear(): Promise<Result<AcademicYear | null>> {
    try {
      const activeYears = await yearRepo.findByQuery('state', '==', 'ACTIVE');
      if (activeYears.length > 0) {
        return ok(activeYears[0]);
      }
      return ok(null);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getActiveSemester(): Promise<Result<AcademicSemesterMaster | null>> {
    try {
      const activeSemesters = await semesterRepo.findByQuery('state', '==', 'ACTIVE');
      if (activeSemesters.length > 0) {
        return ok(activeSemesters[0]);
      }
      return ok(null);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getActivePeriod(): Promise<Result<{ academicYear: AcademicYear | null, semester: AcademicSemesterMaster | null }>> {
    try {
      const yearRes = await this.getActiveAcademicYear();
      const semRes = await this.getActiveSemester();
      
      if (yearRes.isFailure) return fail(yearRes.getError());
      if (semRes.isFailure) return fail(semRes.getError());

      return ok({
        academicYear: yearRes.getValue(),
        semester: semRes.getValue()
      });
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getFullActivePeriodContext(): Promise<Result<PeriodContext | null>> {
     const periodRes = await this.getActivePeriod();
     if (periodRes.isFailure) return fail(periodRes.getError());
     const { academicYear, semester } = periodRes.getValue();

     if (!academicYear || !semester) {
        return ok(null);
     }

     return ok({
        academicYear,
        semester,
        periodId: semester.id!,
        startDate: semester.startDate,
        endDate: semester.endDate
     });
  }

  async getHistoricalPeriodContext(semesterId: string): Promise<Result<PeriodContext | null>> {
     try {
       const sem = await semesterRepo.findById(semesterId);
       if (!sem) return ok(null);
       const year = await yearRepo.findById(sem.academicYearId);
       if (!year) return ok(null);

       return ok({
          academicYear: year,
          semester: sem,
          periodId: sem.id!,
          startDate: sem.startDate,
          endDate: sem.endDate
       });
     } catch (e) {
       return fail(ErrorCodes.DATABASE_ERROR);
     }
  }

  // Legacy Adapters to keep existing system running without modification
  async resolveAcademicYearString(): Promise<Result<string>> {
    try {
      const activeRes = await this.getActiveAcademicYear();
      if (activeRes.isSuccess && activeRes.getValue()) {
        return ok(activeRes.getValue()!.name);
      }
      
      // Fallback to legacy global settings
      if (virtualDatabase.isActive()) {
        const data = await virtualDatabase.getDoc('settings', 'global');
        if (data && data.academicYear) {
          return ok(data.academicYear);
        }
      } else {
        const globalDoc = await getDoc(doc(db, 'settings', 'global'));
        if (globalDoc.exists()) {
          const data = globalDoc.data();
          if (data.academicYear) {
            return ok(data.academicYear);
          }
        }
      }
      return ok('2024/2025'); // Safe fallback
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async resolveSemesterString(): Promise<Result<string>> {
    try {
      const activeRes = await this.getActiveSemester();
      if (activeRes.isSuccess && activeRes.getValue()) {
        const type = activeRes.getValue()!.type;
        return ok(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());
      }
      
      // Fallback to legacy global settings
      if (virtualDatabase.isActive()) {
        const data = await virtualDatabase.getDoc('settings', 'global');
        if (data && data.semester) {
          return ok(data.semester);
        }
      } else {
        const globalDoc = await getDoc(doc(db, 'settings', 'global'));
        if (globalDoc.exists()) {
          const data = globalDoc.data();
          if (data.semester) {
            return ok(data.semester);
          }
        }
      }
      return ok('Ganjil'); // Safe fallback
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  // Synchronize active period to legacy settings global document
  async syncLegacySettings(): Promise<Result<void>> {
    try {
      const periodRes = await this.getFullActivePeriodContext();
      if (periodRes.isSuccess && periodRes.getValue()) {
        const ctx = periodRes.getValue()!;
        const type = ctx.semester.type;
        const formattedSemester = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        
        if (virtualDatabase.isActive()) {
          await virtualDatabase.setDoc('settings', 'global', {
            academicYear: ctx.academicYear.name,
            semester: formattedSemester
          }, { merge: true });
        } else {
          await updateDoc(doc(db, 'settings', 'global'), {
            academicYear: ctx.academicYear.name,
            semester: formattedSemester
          });
        }
      }
      return ok(undefined);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}

export const periodContextService = new PeriodContextService();
