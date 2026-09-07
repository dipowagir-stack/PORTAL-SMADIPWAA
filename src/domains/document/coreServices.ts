import { BaseService } from '../../foundation/core/BaseService';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { FirestoreRepository, FirebaseStorageRepository } from './repositories';
import { isNotEmptyString } from '../../foundation/shared/Validators';
import { QueryConstraint } from 'firebase/firestore';

export class GenericDocumentService<T extends { id?: string }> implements BaseService<T> {
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

  async updateResult(id: string, data: Partial<T>): Promise<Result<T>> {
    try {
      if (!isNotEmptyString(id)) return fail(ErrorCodes.VALIDATION_ERROR);
      const res = await this.update(id, data);
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
      const res = await this.repository.findByQuery(field, '==', value);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  async findWithConstraintsResult(constraints: QueryConstraint[]): Promise<Result<T[]>> {
    try {
      const res = await this.repository.findWithConstraints(constraints);
      return ok(res);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}

export class DocumentStorageService {
  constructor(private storageRepo: FirebaseStorageRepository) {}

  async uploadDocument(ownerId: string, file: File | Blob, fileName: string): Promise<Result<string>> {
    try {
      const path = `documents/${ownerId}/${Date.now()}_${fileName}`;
      const url = await this.storageRepo.uploadFile(path, file);
      return ok(url);
    } catch (e) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  async deleteDocument(url: string): Promise<Result<void>> {
    try {
      // Very basic extraction of path from URL, ideally should be improved or store path in DB
      // But for a simple abstraction this is a start
      // Example: https://firebasestorage.googleapis.com/v0/b/.../o/documents%2Fuser123%2F123_file.pdf?alt=media
      const decodedUrl = decodeURIComponent(url);
      const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
      if (pathMatch && pathMatch[1]) {
        await this.storageRepo.deleteFile(pathMatch[1]);
      }
      return ok(undefined);
    } catch (e) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }
}
