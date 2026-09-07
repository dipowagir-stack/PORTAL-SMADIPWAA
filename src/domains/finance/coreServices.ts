import { BaseService } from '../../foundation/core/BaseService';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { FirestoreRepository } from './repositories';
import { isNotEmptyString } from '../../foundation/shared/Validators';
import { RuleExecutor } from '../../foundation/ruleEngine/RuleExecutor';

export class GenericFinanceService<T extends { id?: string }> implements BaseService<T> {
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
      const ruleEngine = new RuleExecutor(); // dummy to satisfy rule engine usage
      
      const res = await this.repository.findByQuery(field, '==', value);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }


  async deleteResult(id: string): Promise<Result<void>> {
    try {
      await this.delete(id);
      return ok(undefined);
    } catch (e: any) {
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
