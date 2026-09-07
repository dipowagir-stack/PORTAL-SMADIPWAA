import { AcademicYear, PeriodState } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { academicYearService } from './periodServices';
import { periodLifecycleService } from './periodLifecycle';
import { periodContextService } from './periodContext';

export interface CarryForwardAction {
    type: 'CARRY_FORWARD' | 'CLONE' | 'RESET' | 'MANUAL_REVIEW' | 'NO_ACTION';
    reason?: string;
}

export interface RolloverPreparationMatrix {
    classes: CarryForwardAction;
    subjects: CarryForwardAction;
    curriculum: CarryForwardAction;
    teachingAssignments: CarryForwardAction;
    schedules: CarryForwardAction;
    studentEnrollment: CarryForwardAction;
    financeConfiguration: CarryForwardAction;
    academicCalendar: CarryForwardAction;
}

export interface StudentPromotionPreview {
    studentId: string;
    studentName: string;
    currentClassId: string;
    currentClassName: string;
    proposedClassId?: string;
    proposedClassName?: string;
    status: 'READY' | 'WARNING' | 'BLOCKED' | 'GRADUATED';
    reason?: string;
}

export interface TeacherRolloverPreview {
    teacherId: string;
    teacherName: string;
    currentAssignmentSummary: string;
    proposedAssignmentSummary: string;
    status: 'READY' | 'WARNING' | 'MANUAL_REVIEW';
    reason?: string;
}

export interface ClassRolloverPreview {
    existingClassId: string;
    existingClassName: string;
    newClassName: string;
    status: 'READY' | 'WARNING';
    reason?: string;
}

export interface FinancePreparationPreview {
    status: 'READY' | 'WARNING' | 'BLOCKED';
    outstandingInvoices: number;
    feeConfigurationStatus: 'READY' | 'MANUAL_REVIEW';
}

export interface InitializationPayload {
    name: string;
    startDate: number;
    endDate: number;
    createdBy: string;
}

export interface ActivationValidationResult {
    isReady: boolean;
    blockers: string[];
    warnings: string[];
}

export class AcademicYearRolloverService {
    async initializeAcademicYear(payload: InitializationPayload): Promise<Result<AcademicYear>> {
        try {
            if (payload.startDate >= payload.endDate) {
                return fail('Start Date must be before End Date');
            }

            // Check overlap
            const allRes = await academicYearService.getAll();
            if (allRes.isSuccess) {
                const existingYears = allRes.getValue();
                for (const y of existingYears) {
                    if (y.name === payload.name) {
                        return fail('Academic Year name already exists');
                    }
                    if (
                        (payload.startDate >= y.startDate && payload.startDate <= y.endDate) ||
                        (payload.endDate >= y.startDate && payload.endDate <= y.endDate) ||
                        (payload.startDate <= y.startDate && payload.endDate >= y.endDate)
                    ) {
                        return fail('Academic Year dates overlap with existing year');
                    }
                }
            }

            const res = await academicYearService.create({
                name: payload.name,
                startDate: payload.startDate,
                endDate: payload.endDate,
                createdBy: payload.createdBy
            });
            return res;
        } catch (e) {
            return fail(ErrorCodes.DATABASE_ERROR);
        }
    }

    async getCarryForwardMatrix(academicYearId: string): Promise<Result<RolloverPreparationMatrix>> {
        // Return preparation analysis mapping
        // In real app, this analyzes DB schema and configs. For foundation, return defaults based on requirements.
        return ok({
            classes: { type: 'CLONE', reason: 'Basic class structure repeats yearly' },
            subjects: { type: 'CARRY_FORWARD', reason: 'Master subjects are global' },
            curriculum: { type: 'CLONE', reason: 'Curriculum configuration varies per year' },
            teachingAssignments: { type: 'MANUAL_REVIEW', reason: 'Teacher assignments change per year' },
            schedules: { type: 'RESET', reason: 'Schedules are fully regenerated' },
            studentEnrollment: { type: 'MANUAL_REVIEW', reason: 'Requires promotion logic' },
            financeConfiguration: { type: 'CLONE', reason: 'Fee templates are carried over and modified' },
            academicCalendar: { type: 'CLONE', reason: 'Structure remains, dates change' }
        });
    }

    async previewClassRollover(academicYearId: string): Promise<Result<ClassRolloverPreview[]>> {
        // Mocking existing classes from a hypothetical fetch
        // In production, we'd fetch from AcademicClass Repository where academicYearId = current active year
        return ok([
            { existingClassId: 'c1', existingClassName: '10-A', newClassName: '10-A (New Year)', status: 'READY' },
            { existingClassId: 'c2', existingClassName: '11-A', newClassName: '11-A (New Year)', status: 'READY' },
            { existingClassId: 'c3', existingClassName: '12-A', newClassName: '12-A (New Year)', status: 'WARNING', reason: '12th Grade usually graduates, verify if new 12-A needed' }
        ]);
    }

    async previewStudentPromotion(academicYearId: string): Promise<Result<StudentPromotionPreview[]>> {
        // Mocking existing students
        return ok([
            { studentId: 's1', studentName: 'Budi Santoso', currentClassId: 'c1', currentClassName: '10-A', proposedClassId: 'new-c2', proposedClassName: '11-A', status: 'READY' },
            { studentId: 's2', studentName: 'Siti Aminah', currentClassId: 'c2', currentClassName: '11-B', proposedClassId: 'new-c4', proposedClassName: '12-B', status: 'READY' },
            { studentId: 's3', studentName: 'Agus Wijaya', currentClassId: 'c3', currentClassName: '12-A', status: 'GRADUATED', reason: 'Student is in final grade' }
        ]);
    }

    async previewTeacherRollover(academicYearId: string): Promise<Result<TeacherRolloverPreview[]>> {
        // Mocking existing teachers
        return ok([
            { teacherId: 't1', teacherName: 'Pak Andi', currentAssignmentSummary: 'Math 10-A, 11-A', proposedAssignmentSummary: 'Pending Math Assignments', status: 'MANUAL_REVIEW', reason: 'Requires explicit assignment' },
            { teacherId: 't2', teacherName: 'Bu Rina', currentAssignmentSummary: 'Physics 12-A', proposedAssignmentSummary: 'Pending Physics Assignments', status: 'MANUAL_REVIEW', reason: 'Requires explicit assignment' }
        ]);
    }

    async previewFinancePreparation(academicYearId: string): Promise<Result<FinancePreparationPreview>> {
        return ok({
            status: 'READY',
            outstandingInvoices: 15,
            feeConfigurationStatus: 'READY'
        });
    }

    async validateActivation(newYearId: string): Promise<Result<ActivationValidationResult>> {
        try {
            const yearRes = await academicYearService.getById(newYearId);
            if (yearRes.isFailure || !yearRes.getValue()) return fail('Academic Year not found');
            const year = yearRes.getValue()!;
            
            const blockers: string[] = [];
            const warnings: string[] = [];

            if (year.state !== 'PLANNING') {
                blockers.push('Only PLANNING year can be activated');
            }

            // In real app, we check if semesters are created, class structure is ready
            warnings.push('Ensure Semesters are configured');
            warnings.push('Ensure Class Structure is cloned');

            const isReady = blockers.length === 0;
            return ok({ isReady, blockers, warnings });
        } catch(e) {
            return fail(ErrorCodes.DATABASE_ERROR);
        }
    }

    async activateAcademicYear(newYearId: string, userId: string): Promise<Result<AcademicYear>> {
        try {
            // 1. Validate state
            const valRes = await this.validateActivation(newYearId);
            if (valRes.isFailure) return fail(valRes.getError());
            if (!valRes.getValue().isReady) return fail('Validation failed. Please resolve blockers.');

            // 2. Identify currently active year
            const activeRes = await periodContextService.getActiveAcademicYear();
            if (activeRes.isSuccess && activeRes.getValue()) {
                const oldYear = activeRes.getValue()!;
                // 3. Explicitly close active year
                const closeRes = await periodLifecycleService.closeAcademicYear(oldYear.id!, userId);
                if (closeRes.isFailure) return fail('Failed to close current active year: ' + closeRes.getError());
            }

            // 4. Activate new year
            const actRes = await periodLifecycleService.activateAcademicYear(newYearId, userId);
            if (actRes.isFailure) return fail('Failed to activate new year: ' + actRes.getError());

            return actRes;
        } catch (e) {
            return fail(ErrorCodes.DATABASE_ERROR);
        }
    }
}

export const academicYearRolloverService = new AcademicYearRolloverService();
