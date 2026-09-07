import { TenantAwareRepository } from './TenantAwareRepository';
import { SecurityContext } from '../security/types';
import { Result, ok, fail } from '../core/Result';
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  QueryConstraint
} from 'firebase/firestore';

export abstract class BaseFirestoreTenantRepository<T extends { id: string; tenantId?: string }> implements TenantAwareRepository<T> {
  
  protected constructor(protected readonly collectionName: string) {}

  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

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
    const validation = this.validateContext(context);
    if (validation.isFailure) return false;

    const docRef = doc(this.getCollectionRef(), id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return false;

    // Cross-tenant protection
    if (!context.isPlatformAdmin && docSnap.data().tenantId !== context.tenantId) {
      return false;
    }

    return true;
  }

  async save(t: T, context: SecurityContext): Promise<Result<T>> {
    const validation = this.validateWriteContext(context);
    if (validation.isFailure) return fail(validation.getError());

    // Ensure tenantId is injected
    if (!context.isPlatformAdmin) {
      t.tenantId = context.tenantId as string;
    } else if (!t.tenantId && context.tenantId) {
      t.tenantId = context.tenantId;
    }

    try {
      const docRef = doc(this.getCollectionRef(), t.id);
      await setDoc(docRef, t, { merge: true });
      return ok(t);
    } catch (error: any) {
      return fail(error.message || 'Failed to save document');
    }
  }

  async delete(id: string, context: SecurityContext): Promise<Result<void>> {
    const validation = this.validateWriteContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const docRef = doc(this.getCollectionRef(), id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return fail('Document not found');
      
      // Cross-tenant protection
      if (!context.isPlatformAdmin && docSnap.data().tenantId !== context.tenantId) {
        return fail('Unauthorized: Cross-tenant delete attempt blocked');
      }

      await deleteDoc(docRef);
      return ok(undefined);
    } catch (error: any) {
      return fail(error.message || 'Failed to delete document');
    }
  }

  async findById(id: string, context: SecurityContext): Promise<Result<T | null>> {
    const validation = this.validateContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const docRef = doc(this.getCollectionRef(), id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return ok(null);

      const data = docSnap.data() as T;

      // Cross-tenant protection
      if (!context.isPlatformAdmin && data.tenantId !== context.tenantId) {
        return fail('Unauthorized: Cross-tenant read attempt blocked');
      }

      return ok({ id: docSnap.id, ...data } as T);
    } catch (error: any) {
      return fail(error.message || 'Failed to find document');
    }
  }

  async findAll(context: SecurityContext): Promise<Result<T[]>> {
    const validation = this.validateContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const constraints: QueryConstraint[] = [];
      
      if (!context.isPlatformAdmin) {
        constraints.push(where('tenantId', '==', context.tenantId));
      } else if (context.tenantId) {
        // Platform admin can optionally scope by tenant
        constraints.push(where('tenantId', '==', context.tenantId));
      }

      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);

      const results: T[] = [];
      snapshot.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() } as T);
      });

      return ok(results);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch documents');
    }
  }

  /**
   * Protected helper to query with explicit tenant scope
   */
  protected async queryWithTenant(context: SecurityContext, additionalConstraints: QueryConstraint[] = []): Promise<Result<T[]>> {
    const validation = this.validateContext(context);
    if (validation.isFailure) return fail(validation.getError());

    try {
      const constraints: QueryConstraint[] = [...additionalConstraints];
      
      if (!context.isPlatformAdmin) {
        constraints.push(where('tenantId', '==', context.tenantId));
      } else if (context.tenantId) {
        constraints.push(where('tenantId', '==', context.tenantId));
      }

      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);

      const results: T[] = [];
      snapshot.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() } as T);
      });

      return ok(results);
    } catch (error: any) {
      return fail(error.message || 'Failed to execute query');
    }
  }
}
