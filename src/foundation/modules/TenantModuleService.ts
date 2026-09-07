import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { TenantModule } from './types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { SecurityContext } from '../security/types';
import { entitlementService } from '../tenant/EntitlementService';
import { moduleDependencyService } from './ModuleDependencyService';

export class TenantModuleService {
  async getTenantModules(tenantId: string, context: SecurityContext): Promise<Result<TenantModule[]>> {
    if (!context.isPlatformAdmin && context.tenantId !== tenantId) {
      return fail('Unauthorized: Cannot access modules for a different tenant.');
    }

    try {
      const q = query(collection(db, 'tenant_modules'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const modules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TenantModule));
      return ok(modules);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch tenant modules');
    }
  }

  async isModuleEnabled(tenantId: string, moduleCode: string, context: SecurityContext): Promise<Result<boolean>> {
    if (!context.isPlatformAdmin && context.tenantId !== tenantId) {
      return fail('Unauthorized');
    }

    const hasAccessRes = await entitlementService.hasModuleAccess(tenantId, moduleCode, context);
    if (hasAccessRes.isFailure) return fail(hasAccessRes.getError());
    
    return ok(hasAccessRes.getValue());
  }

  async enableModule(tenantId: string, moduleCode: string, context: SecurityContext): Promise<Result<void>> {
    if (!context.isPlatformAdmin) {
       // Typically only PlatformAdmin or specific tenant roles can enable modules.
       // Let's assume Platform Admin only for now based on prompt.
       return fail('Unauthorized: Only Platform Admin can enable modules directly.');
    }

    // Entitlement Check
    const hasAccessRes = await entitlementService.hasModuleAccess(tenantId, moduleCode, context);
    if (hasAccessRes.isFailure || !hasAccessRes.getValue()) {
       return fail('Tenant is not entitled to this module. Please update subscription first.');
    }

    // Dep Check
    const entitlementRes = await entitlementService.getTenantEntitlement(tenantId, context);
    if (entitlementRes.isFailure) return fail(entitlementRes.getError());
    const activeModules = entitlementRes.getValue().activeModules;

    const depRes = await moduleDependencyService.validateDependencies(moduleCode, activeModules);
    if (depRes.isFailure) return fail(depRes.getError());

    try {
      const q = query(
        collection(db, 'tenant_modules'), 
        where('tenantId', '==', tenantId),
        where('moduleId', '==', moduleCode)
      );
      const snap = await getDocs(q);
      let docRef;

      if (snap.empty) {
        docRef = doc(collection(db, 'tenant_modules'));
      } else {
        docRef = doc(db, 'tenant_modules', snap.docs[0].id);
      }

      await setDoc(docRef, {
        tenantId,
        moduleId: moduleCode,
        status: 'ENABLED',
        enabledAt: Date.now(),
        source: 'MANUAL'
      }, { merge: true });

      return ok(undefined);
    } catch (error: any) {
      return fail(error.message);
    }
  }
}

export const tenantModuleService = new TenantModuleService();
