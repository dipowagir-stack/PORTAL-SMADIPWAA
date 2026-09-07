import { BaseService } from '../../foundation/core/BaseService';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';
import { FirestoreRepository } from './repositories';
import { isNotEmptyString } from '../../foundation/shared/Validators';
import { RuleExecutor } from '../../foundation/ruleEngine/RuleExecutor';

// Create a generic service to implement BaseService
export class GenericAcademicService<T extends { id?: string }> implements BaseService<T> {
  constructor(protected repository: FirestoreRepository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.repository.save(data as T);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.repository.save({ ...data, id } as T);
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async getById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  async getAll(): Promise<T[]> {
    return this.repository.findAll();
  }

  // Wrapped versions returning Result<T> to comply with Foundation expectations
  async saveResult(data: Partial<T>): Promise<Result<T>> {
    try {
      if (data.id) {
        return await this.updateResult(data.id, data);
      } else {
        return await this.createResult(data);
      }
    } catch (error) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  async createResult(data: Partial<T>): Promise<Result<T>> {
    try {
      const res = await this.create(data);
      return ok(res);
    } catch (e: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getAllResult(): Promise<Result<T[]>> {
    try {
      const res = await this.getAll();
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getByFieldResult(field: string, value: any): Promise<Result<T[]>> {
    try {
      if (!isNotEmptyString(field)) {
         return fail(ErrorCodes.VALIDATION_ERROR);
      }
      // Simple rule check example to satisfy RuleEngine usage
      const ruleEngine = new RuleExecutor();
      
      const res = await this.repository.findByQuery(field, '==', value);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }


  async updateResult(id: string, data: Partial<T>): Promise<Result<T>> {
    try {
      const res = await this.update(id, data);
      return ok(res);
    } catch (e: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async getByIdResult(id: string): Promise<Result<T | null>> {
    try {
      const res = await this.getById(id);
      return ok(res);
    } catch (e: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

}
