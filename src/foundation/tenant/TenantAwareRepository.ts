import { SecurityContext } from '../security/types';
import { Result } from '../core/Result';

/**
 * Foundation for Tenant-aware repositories.
 * Enforces passing SecurityContext to ensure data isolation.
 */
export interface TenantAwareRepository<T> {
  exists(id: string, context: SecurityContext): Promise<boolean>;
  save(t: T, context: SecurityContext): Promise<Result<T>>;
  delete(id: string, context: SecurityContext): Promise<Result<void>>;
  findById(id: string, context: SecurityContext): Promise<Result<T | null>>;
  findAll(context: SecurityContext): Promise<Result<T[]>>;
}
