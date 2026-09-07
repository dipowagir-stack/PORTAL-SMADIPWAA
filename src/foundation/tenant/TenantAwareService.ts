import { SecurityContext } from '../security/types';
import { Result } from '../core/Result';

/**
 * Foundation for Tenant-aware services.
 * Requires SecurityContext on all core operations.
 */
export interface TenantAwareService<T> {
  create(data: Partial<T>, context: SecurityContext): Promise<Result<T>>;
  update(id: string, data: Partial<T>, context: SecurityContext): Promise<Result<T>>;
  delete(id: string, context: SecurityContext): Promise<Result<void>>;
  getById(id: string, context: SecurityContext): Promise<Result<T | null>>;
  getAll(context: SecurityContext): Promise<Result<T[]>>;
}
