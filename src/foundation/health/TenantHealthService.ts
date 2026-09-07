import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { TenantHealth, ModuleHealth, ReleaseHealth, ConfigurationHealth, HealthStatus } from './types';
import { entitlementService } from '../tenant/EntitlementService';
import { versionService } from '../release/VersionService';
import { tenantModuleService } from '../modules/TenantModuleService';
import { SecurityContext } from '../security/types';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Tenant } from '../tenant/types';
import { moduleDependencyService } from '../modules/ModuleDependencyService';

export class TenantHealthService {
  private static instance: TenantHealthService;

  private constructor() {}

  public static getInstance(): TenantHealthService {
    if (!TenantHealthService.instance) {
      TenantHealthService.instance = new TenantHealthService();
    }
    return TenantHealthService.instance;
  }

  public async getTenantHealth(tenantId: string, context: SecurityContext): Promise<Result<TenantHealth>> {
    // 1. Permission check
    if (!context.isPlatformAdmin && context.tenantId !== tenantId) {
      // Is support? Platform support is checked at the route level usually, but we should enforce strictly here.
      if (!context.roles?.includes('platform_support')) {
         return fail('Unauthorized: Cannot access health for a different tenant.');
      }
    }

    try {
      // 1. Get Tenant Status
      const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
      if (!tenantDoc.exists()) {
        return fail('Tenant not found');
      }
      const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;

      // 2. Get Entitlement & Subscription Status
      const entitlementRes = await entitlementService.getTenantEntitlement(tenantId, context);
      if (entitlementRes.isFailure) return fail(entitlementRes.getError());
      const entitlement = entitlementRes.getValue();

      let subStatus = entitlement.subscription?.status || (entitlement.isLegacy ? 'ACTIVE' : 'TRIAL');
      if (entitlement.isLegacy) {
          subStatus = 'ACTIVE';
      }

      // 3. Assess Module Health
      const moduleHealthList: ModuleHealth[] = [];
      const tenantModulesRes = await tenantModuleService.getTenantModules(tenantId, context);
      const tenantModules = tenantModulesRes.isSuccess ? tenantModulesRes.getValue() : [];
      
      let hasDegradedModule = false;
      let hasBlockedModule = false;

      for (const mod of entitlement.activeModules) {
        // Check if explicitly disabled or something
        const tMod = tenantModules.find(m => m.moduleId === mod);
        let status: ModuleHealth['status'] = 'ENABLED';
        if (tMod && tMod.status !== 'ENABLED') {
           status = 'DISABLED';
        }
        
        // Dependency check
        const depRes = await moduleDependencyService.validateDependencies(mod, entitlement.activeModules);
        let missingDeps: string[] = [];
        if (depRes.isFailure) {
           status = 'BLOCKED';
           hasBlockedModule = true;
           // parse missing deps from error or just put general
           missingDeps = [depRes.getError()];
        }

        moduleHealthList.push({
           moduleCode: mod,
           status,
           entitlement: true,
           missingDependencies: missingDeps,
           compatibility: 'COMPATIBLE'
        });
      }

      // 4. Release Health
      const currentClientRes = await versionService.getCurrentClientVersion();
      let currentVersion = 'unknown';
      if (currentClientRes.isSuccess) {
         currentVersion = currentClientRes.getValue().currentVersion;
      }
      
      const updateRes = await versionService.isUpdateAvailable();
      let updateRequired = false;
      let migrationRequired = false;
      let releaseStatus: ReleaseHealth['status'] = 'CURRENT';

      if (updateRes.isSuccess) {
          const updateData = updateRes.getValue();
          updateRequired = updateData.forceUpdate;
          if (updateData.updateAvailable) {
             releaseStatus = updateData.forceUpdate ? 'MIGRATION_REQUIRED' : 'UPDATE_AVAILABLE';
          }
      }

      const releaseHealth: ReleaseHealth = {
         currentVersion,
         applicableRelease: currentVersion,
         releaseChannel: 'STABLE' as any,
         updateRequired,
         migrationRequired,
         status: releaseStatus
      };

      // 5. Configuration Health
      // A simple validation for critical settings
      const invalidSettings: string[] = [];
      const missingRequiredSettings: string[] = [];
      let configStatus: ConfigurationHealth['status'] = 'READY';

      if (!tenant.name) {
          missingRequiredSettings.push('name');
          configStatus = 'INCOMPLETE';
      }
      if (!tenant.timezone) {
          missingRequiredSettings.push('timezone');
          configStatus = 'INCOMPLETE';
      }

      const configurationStatus: ConfigurationHealth = {
          status: configStatus,
          invalidSettings,
          missingRequiredSettings
      };

      // 6. Overall Status Evaluation
      let overallStatus: HealthStatus = 'HEALTHY';
      
      if (tenant.status === 'SUSPENDED') {
          overallStatus = 'BLOCKED';
      } else if (subStatus === 'EXPIRED' || subStatus === 'SUSPENDED' || entitlement.isReadOnly) {
          overallStatus = 'WARNING';
      } else if (hasBlockedModule || configStatus === 'INVALID' as any) {
          overallStatus = 'DEGRADED';
      } else if (configStatus === 'INCOMPLETE' || releaseHealth.status === 'MIGRATION_REQUIRED') {
          overallStatus = 'WARNING';
      } else if (tenant.status === 'PROVISIONING') {
          overallStatus = 'UNKNOWN';
      }

      const healthData: TenantHealth = {
        tenantId,
        status: overallStatus,
        subscriptionStatus: subStatus as any,
        moduleHealth: moduleHealthList,
        releaseHealth,
        configurationStatus,
        lastSuccessfulCheck: Date.now(),
        updatedAt: Date.now()
      };

      return ok(healthData);
    } catch (error: any) {
      console.error('Failed to get tenant health:', error);
      return fail(error.message || 'Failed to check tenant health');
    }
  }

  public async getTenantIssues(tenantId: string, context: SecurityContext) {
      // Would fetch from a `tenant_issues` collection, returning empty for now
      return ok([]);
  }
}

export const tenantHealthService = TenantHealthService.getInstance();
