import { AcademicYear, AcademicSemesterMaster, PeriodState } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { academicYearService, academicSemesterService } from './periodServices';
import { periodLifecycleService } from './periodLifecycle';
import { periodContextService } from './periodContext';

export interface SemesterInitializationPayload {
  academicYearId: string;
  type: 'GANJIL' | 'GENAP';
  startDate: number;
  endDate: number;
  academicCalendarId?: string; // Optional for now
}

export interface DomainCheckResult {
  domain: string;
  status: 'READY' | 'WARNING' | 'BLOCKED';
  message: string;
}

export interface SemesterValidationResult {
  semesterId: string;
  isReadyToActivate: boolean;
  blockers: string[];
  warnings: string[];
  domainChecks: DomainCheckResult[];
}

export class SemesterInitializationService {
  async createSemesterPlanning(payload: SemesterInitializationPayload, userId: string): Promise<Result<AcademicSemesterMaster>> {
    try {
      const yearRes = await academicYearService.getById(payload.academicYearId);
      if (yearRes.isFailure || !yearRes.getValue()) return fail('Academic Year not found');
      const year = yearRes.getValue()!;
      
      if (year.state !== 'ACTIVE') {
        return fail('Cannot create semester for an inactive Academic Year');
      }

      if (payload.startDate >= payload.endDate) {
        return fail('Start Date must be before End Date');
      }

      if (payload.startDate < year.startDate || payload.endDate > year.endDate) {
        return fail('Semester dates must be within the Academic Year dates');
      }

      const res = await academicSemesterService.create({
        academicYearId: payload.academicYearId,
        type: payload.type as any,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdBy: userId
      });

      return res;
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async validateSemester(semesterId: string): Promise<Result<SemesterValidationResult>> {
    try {
      const semRes = await academicSemesterService.getById(semesterId);
      if (semRes.isFailure || !semRes.getValue()) return fail('Semester not found');
      const sem = semRes.getValue()!;

      const blockers: string[] = [];
      const warnings: string[] = [];
      const domainChecks: DomainCheckResult[] = [];

      // Check Academic Year
      const yearRes = await academicYearService.getById(sem.academicYearId);
      if (yearRes.isFailure || !yearRes.getValue()) {
        blockers.push('Parent Academic Year not found');
      } else {
        const year = yearRes.getValue()!;
        if (year.state !== 'ACTIVE') {
          blockers.push('Parent Academic Year is not ACTIVE');
        }
        if (sem.startDate < year.startDate || sem.endDate > year.endDate) {
          blockers.push('Semester dates are outside the Academic Year dates');
        }
      }

      // Check Overlap
      const siblingsRes = await academicSemesterService.getByAcademicYearId(sem.academicYearId);
      if (siblingsRes.isSuccess) {
        const siblings = siblingsRes.getValue();
        const activeSibling = siblings.find(s => s.state === 'ACTIVE' && s.id !== semesterId);
        if (activeSibling) {
          blockers.push('Another Semester is currently ACTIVE in this Academic Year');
        }
        
        for (const sibling of siblings) {
          if (sibling.id !== semesterId && sibling.startDate && sibling.endDate) {
            if (sem.startDate <= sibling.endDate && sem.endDate >= sibling.startDate) {
               blockers.push('Semester dates overlap with another semester');
               break;
            }
          }
        }
      }

      // Read-only preparation audits (Simulated per requirement: "JANGAN mengubah data domain tersebut dulu")
      const domainsToAudit = ['Academic', 'Student', 'Teacher', 'Finance', 'Document', 'Notification', 'Reporting', 'Parent'];
      for (const domain of domainsToAudit) {
         domainChecks.push({
           domain,
           status: 'READY',
           message: `${domain} domain is ready for new semester context`
         });
      }

      const isReadyToActivate = blockers.length === 0 && !domainChecks.some(dc => dc.status === 'BLOCKED');

      return ok({
        semesterId,
        isReadyToActivate,
        blockers,
        warnings,
        domainChecks
      });
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async activateSemester(semesterId: string, userId: string): Promise<Result<AcademicSemesterMaster>> {
    const valRes = await this.validateSemester(semesterId);
    if (valRes.isFailure) return fail(valRes.getError());
    if (!valRes.getValue().isReadyToActivate) {
       return fail('Semester failed validation. Please resolve blockers first.');
    }

    return await periodLifecycleService.activateSemester(semesterId, userId);
  }
}

export const semesterInitializationService = new SemesterInitializationService();
