import { TenantAwareRepository } from './TenantAwareRepository';
import { SecurityContext } from '../security/types';
import { Result, ok, fail } from '../core/Result';
import { apiClient } from '../../lib/apiClient';

export abstract class BaseSqlTenantRepository<T extends { id: string; tenantId?: string }> implements TenantAwareRepository<T> {
  
  protected constructor(protected readonly collectionName: string) {}

  protected validateContext(context: SecurityContext): Result<void> {
    if (!context.isPlatformAdmin && !context.tenantId) {
      return fail('Unauthorized: Missing Tenant Context');
    }
    return ok(undefined);
  }

  protected validateWriteContext(context: SecurityContext): Result<void> {
    const baseValidation = this.validateContext(context);
    if (baseValidation.isFailure) return baseValidation;
    if (context.isReadOnly && !context.isPlatformAdmin) {
      return fail('Unauthorized: Tenant subscription is in Read-Only state.');
    }
    return ok(undefined);
  }

  async exists(id: string, context: SecurityContext): Promise<boolean> {
    const res = await this.findById(id, context);
    return res.isSuccess && !!res.getValue();
  }

  async save(t: T, context: SecurityContext): Promise<Result<T>> {
    const validation = this.validateWriteContext(context);
    if (validation.isFailure) return fail(validation.getError());

    if (!context.isPlatformAdmin) {
      t.tenantId = context.tenantId as string;
    } else if (!t.tenantId && context.tenantId) {
      t.tenantId = context.tenantId;
    }

    try {
      const res = await apiClient.setDocument(this.collectionName, t.id, t);
      if (res.success) {
        return ok(t);
      }
      return fail(res.error || 'Failed to save to database');
    } catch (err: any) {
      return fail(err.message || 'Network error while saving document');
    }
  }

  async delete(id: string, context: SecurityContext): Promise<Result<void>> {
    const validation = this.validateWriteContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const res = await apiClient.deleteDocument(this.collectionName, id);
      if (res.success) {
        return ok(undefined);
      }
      return fail(res.error || 'Failed to delete document');
    } catch (err: any) {
      return fail(err.message || 'Network error while deleting document');
    }
  }

  async findById(id: string, context: SecurityContext): Promise<Result<T | null>> {
    const validation = this.validateContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const doc = await apiClient.getDocument(this.collectionName, id);
      if (!doc) return ok(null);

      if (!context.isPlatformAdmin && doc.tenantId && doc.tenantId !== context.tenantId) {
        return fail('Unauthorized: Cross-tenant access blocked');
      }

      return ok(doc as T);
    } catch (err: any) {
      return fail(err.message || 'Failed to find document');
    }
  }

  async findAll(context: SecurityContext): Promise<Result<T[]>> {
    const validation = this.validateContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const items = await apiClient.getCollection(this.collectionName);
      let filtered = items;

      if (!context.isPlatformAdmin && context.tenantId) {
        filtered = items.filter((it: any) => it.tenantId === context.tenantId);
      }

      return ok(filtered as T[]);
    } catch (err: any) {
      return fail(err.message || 'Failed to fetch items');
    }
  }
}
