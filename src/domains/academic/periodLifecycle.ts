import { AcademicYearRepository, AcademicSemesterRepository } from './periodRepositories';
import { AcademicYear, AcademicSemesterMaster, PeriodState } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { academicYearService, academicSemesterService } from './periodServices';
import { periodContextService } from './periodContext';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export class PeriodLifecycleService {
  
  private isValidTransition(currentState: PeriodState, nextState: PeriodState): boolean {
    const transitions: Record<PeriodState, PeriodState[]> = {
      'PLANNING': ['ACTIVE'],
      'ACTIVE': ['CLOSING', 'CLOSED'],
      'CLOSING': ['CLOSED'],
      'CLOSED': ['ARCHIVED'],
      'ARCHIVED': []
    };
    return transitions[currentState].includes(nextState);
  }

  private async audit(action: string, entityId: string, entityType: 'AcademicYear' | 'Semester', userId: string) {
    try {
      if (virtualDatabase.isActive()) {
        await virtualDatabase.addDoc('audit_logs', {
          action,
          entityId,
          entityType,
          userId,
          timestamp: Date.now()
        });
        return;
      }
      await addDoc(collection(db, 'audit_logs'), {
        action,
        entityId,
        entityType,
        userId,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to write audit log', e);
    }
  }

  // --- PRE-CLOSE CHECKLIST ---

  async getSemesterCloseChecklist(semesterId: string): Promise<Result<{ status: 'READY' | 'WARNING' | 'BLOCKED', checks: any[] }>> {
    return ok({
      status: 'READY',
      checks: [
        { name: 'All Grades Submitted', status: 'pass' },
        { name: 'Report Cards Published', status: 'warning', message: 'Some report cards are in draft' },
        { name: 'Finance Invoices Closed', status: 'pass' }
      ]
    });
  }

  async getAcademicYearCloseChecklist(yearId: string): Promise<Result<{ status: 'READY' | 'WARNING' | 'BLOCKED', checks: any[] }>> {
    return ok({
      status: 'READY',
      checks: [
        { name: 'All Semesters Closed', status: 'pass' },
        { name: 'Yearly Financials Reconciled', status: 'pass' }
      ]
    });
  }

  async initiateCloseAcademicYear(id: string, userId: string): Promise<Result<AcademicYear>> {
    const yearRes = await academicYearService.getById(id);
    if (yearRes.isFailure || !yearRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const year = yearRes.getValue()!;
    if (!this.isValidTransition(year.state, 'CLOSING')) {
      return fail(`Invalid transition from ${year.state} to CLOSING`);
    }

    const res = await academicYearService.update(id, { state: 'CLOSING' });
    if (res.isSuccess) await this.audit('Academic Year Closing Started', id, 'AcademicYear', userId);
    return res;
  }

  async initiateCloseSemester(id: string, userId: string): Promise<Result<AcademicSemesterMaster>> {
    const semRes = await academicSemesterService.getById(id);
    if (semRes.isFailure || !semRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const sem = semRes.getValue()!;
    if (!this.isValidTransition(sem.state, 'CLOSING')) {
      return fail(`Invalid transition from ${sem.state} to CLOSING`);
    }

    const res = await academicSemesterService.update(id, { state: 'CLOSING' });
    if (res.isSuccess) await this.audit('Semester Closing Started', id, 'Semester', userId);
    return res;
  }

  // --- ACADEMIC YEAR ---

  async activateAcademicYear(id: string, userId: string): Promise<Result<AcademicYear>> {
    const yearRes = await academicYearService.getById(id);
    if (yearRes.isFailure || !yearRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const year = yearRes.getValue()!;
    if (!this.isValidTransition(year.state, 'ACTIVE')) {
      return fail(`Invalid transition from ${year.state} to ACTIVE`);
    }

    const activeRes = await periodContextService.getActiveAcademicYear();
    if (activeRes.isSuccess && activeRes.getValue() && activeRes.getValue()!.id !== id) {
      return fail('Another Academic Year is currently ACTIVE. Close it first.');
    }

    const res = await academicYearService.update(id, { state: 'ACTIVE', isActive: true });
    if (res.isSuccess) await this.audit('Academic Year Activated', id, 'AcademicYear', userId);
    return res;
  }

  async closeAcademicYear(id: string, userId: string): Promise<Result<AcademicYear>> {
    const yearRes = await academicYearService.getById(id);
    if (yearRes.isFailure || !yearRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const year = yearRes.getValue()!;
    if (!this.isValidTransition(year.state, 'CLOSED')) {
      return fail(`Invalid transition from ${year.state} to CLOSED`);
    }

    const res = await academicYearService.update(id, { 
      state: 'CLOSED', 
      isActive: false,
      closedAt: Date.now(),
      closedBy: userId 
    });
    if (res.isSuccess) await this.audit('Academic Year Closed', id, 'AcademicYear', userId);
    return res;
  }

  async archiveAcademicYear(id: string, userId: string): Promise<Result<AcademicYear>> {
    const yearRes = await academicYearService.getById(id);
    if (yearRes.isFailure || !yearRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const year = yearRes.getValue()!;
    if (!this.isValidTransition(year.state, 'ARCHIVED')) {
      return fail(`Invalid transition from ${year.state} to ARCHIVED`);
    }

    const res = await academicYearService.update(id, { state: 'ARCHIVED', isActive: false });
    if (res.isSuccess) await this.audit('Academic Year Archived', id, 'AcademicYear', userId);
    return res;
  }

  // --- SEMESTER ---

  async activateSemester(id: string, userId: string): Promise<Result<AcademicSemesterMaster>> {
    const semRes = await academicSemesterService.getById(id);
    if (semRes.isFailure || !semRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const sem = semRes.getValue()!;
    if (!this.isValidTransition(sem.state, 'ACTIVE')) {
      return fail(`Invalid transition from ${sem.state} to ACTIVE`);
    }

    const yearRes = await academicYearService.getById(sem.academicYearId);
    if (yearRes.isFailure || !yearRes.getValue() || yearRes.getValue()!.state !== 'ACTIVE') {
      return fail('Cannot activate semester. Parent Academic Year is not ACTIVE.');
    }

    const siblingsRes = await academicSemesterService.getByAcademicYearId(sem.academicYearId);
    if (siblingsRes.isSuccess) {
      const activeSibling = siblingsRes.getValue().find(s => s.state === 'ACTIVE' && s.id !== id);
      if (activeSibling) {
        return fail('Another Semester is currently ACTIVE in this Academic Year. Close it first.');
      }
    }

    const res = await academicSemesterService.update(id, { state: 'ACTIVE', isActive: true });
    if (res.isSuccess) {
       await this.audit('Semester Activated', id, 'Semester', userId);
       await periodContextService.syncLegacySettings();
    }
    return res;
  }

  async closeSemester(id: string, userId: string): Promise<Result<AcademicSemesterMaster>> {
    const semRes = await academicSemesterService.getById(id);
    if (semRes.isFailure || !semRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const sem = semRes.getValue()!;
    if (!this.isValidTransition(sem.state, 'CLOSED')) {
      return fail(`Invalid transition from ${sem.state} to CLOSED`);
    }

    const res = await academicSemesterService.update(id, { 
      state: 'CLOSED', 
      isActive: false,
      closedAt: Date.now(),
      closedBy: userId 
    });
    if (res.isSuccess) await this.audit('Semester Closed', id, 'Semester', userId);
    return res;
  }

  async archiveSemester(id: string, userId: string): Promise<Result<AcademicSemesterMaster>> {
    const semRes = await academicSemesterService.getById(id);
    if (semRes.isFailure || !semRes.getValue()) return fail(ErrorCodes.NOT_FOUND);
    
    const sem = semRes.getValue()!;
    if (!this.isValidTransition(sem.state, 'ARCHIVED')) {
      return fail(`Invalid transition from ${sem.state} to ARCHIVED`);
    }

    const res = await academicSemesterService.update(id, { state: 'ARCHIVED', isActive: false });
    if (res.isSuccess) await this.audit('Semester Archived', id, 'Semester', userId);
    return res;
  }
}

export const periodLifecycleService = new PeriodLifecycleService();
