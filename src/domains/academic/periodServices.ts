import { AcademicYearRepository, AcademicSemesterRepository } from './periodRepositories';
import { AcademicYear, AcademicSemesterMaster, PeriodState } from './types';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';

const yearRepo = new AcademicYearRepository();
const semesterRepo = new AcademicSemesterRepository();

export class AcademicYearService {
  async getById(id: string): Promise<Result<AcademicYear | null>> {
    try {
      const res = await yearRepo.findById(id);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getAll(): Promise<Result<AcademicYear[]>> {
    try {
      const res = await yearRepo.findAll();
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async create(data: Partial<AcademicYear>): Promise<Result<AcademicYear>> {
    try {
      // Validate date
      if (data.startDate && data.endDate && data.startDate >= data.endDate) {
        return fail('Invalid date range');
      }
      data.state = 'PLANNING';
      data.isActive = false;
      data.createdAt = Date.now();
      const res = await yearRepo.save(data as AcademicYear);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async update(id: string, data: Partial<AcademicYear>): Promise<Result<AcademicYear>> {
    try {
      data.updatedAt = Date.now();
      const res = await yearRepo.save({ ...data, id } as AcademicYear);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}

export class AcademicSemesterService {
  async getAll(): Promise<Result<AcademicSemesterMaster[]>> {
    try {
      const res = await semesterRepo.findAll();
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getById(id: string): Promise<Result<AcademicSemesterMaster | null>> {
    try {
      const res = await semesterRepo.findById(id);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getByAcademicYearId(academicYearId: string): Promise<Result<AcademicSemesterMaster[]>> {
    try {
      const res = await semesterRepo.findByQuery('academicYearId', '==', academicYearId);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async create(data: Partial<AcademicSemesterMaster>): Promise<Result<AcademicSemesterMaster>> {
    try {
      if (!data.academicYearId) return fail('AcademicYearId is required');
      if (data.startDate && data.endDate && data.startDate >= data.endDate) {
        return fail('Invalid date range');
      }
      
      const siblingsRes = await this.getByAcademicYearId(data.academicYearId);
      if (siblingsRes.isSuccess) {
        const siblings = siblingsRes.getValue();
        // Check overlapping dates
        if (data.startDate && data.endDate) {
           for (const sibling of siblings) {
             if (sibling.startDate && sibling.endDate) {
               if (data.startDate <= sibling.endDate && data.endDate >= sibling.startDate) {
                 return fail('Overlapping semester dates within the same academic year');
               }
             }
           }
        }
      }

      data.state = 'PLANNING';
      data.isActive = false;
      data.createdAt = Date.now();
      const res = await semesterRepo.save(data as AcademicSemesterMaster);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async update(id: string, data: Partial<AcademicSemesterMaster>): Promise<Result<AcademicSemesterMaster>> {
    try {
      data.updatedAt = Date.now();
      const res = await semesterRepo.save({ ...data, id } as AcademicSemesterMaster);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}

export const academicYearService = new AcademicYearService();
export const academicSemesterService = new AcademicSemesterService();
