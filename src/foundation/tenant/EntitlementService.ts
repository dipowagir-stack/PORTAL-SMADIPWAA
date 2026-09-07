import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { TenantSubscription, SubscriptionPlan, TenantEntitlement } from './subscriptionTypes';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { SecurityContext } from '../security/types';

export class EntitlementService {
  /**
   * Public check for admission entitlement (used by public websites to toggle CTA)
   */
  async getPublicAdmissionStatus(tenantId: string): Promise<Result<boolean>> {
    try {
      const subQuery = query(collection(db, 'tenant_subscriptions'), where('tenantId', '==', tenantId));
      const subSnap = await getDocs(subQuery);
      if (subSnap.empty) {
        return ok(true); // Legacy defaults to true
      }
      const subscriptions = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      subscriptions.sort((a, b) => b.endDate - a.endDate);
      const currentSub = subscriptions[0];
      
      const planDoc = await getDoc(doc(db, 'subscription_plans', currentSub.planId));
      let activeModules: string[] = [];
      if (planDoc.exists()) {
        activeModules = planDoc.data().includedModules || [];
      }
      return ok(activeModules.includes('admission') || activeModules.length === 0);
    } catch (error: any) {
      return ok(false);
    }
  }
  /**
   * Evaluates the entitlement status for a given tenant.
   * If the tenant does not have a subscription, it defaults to a legacy (grandfathered) full-access state.
   */
  async getTenantEntitlement(tenantId: string, context: SecurityContext): Promise<Result<TenantEntitlement>> {
    // Basic context validation
    if (!context.isPlatformAdmin && context.tenantId !== tenantId) {
      return fail('Unauthorized: Cannot access entitlement for a different tenant.');
    }

    try {
      const subQuery = query(collection(db, 'tenant_subscriptions'), where('tenantId', '==', tenantId));
      const subSnap = await getDocs(subQuery);

      if (subSnap.empty) {
        // Backward compatibility: Legacy tenants without a subscription get grandfathered full access.
        // Or you can configure a default set of modules.
        const defaultModules = ['academic', 'finance', 'parent', 'admission', 'supervision', 'document', 'reporting', 'ai', 'website', 'student', 'teacher', 'admin', 'tu'];
        return ok({
          tenantId,
          isSubscriptionActive: true,
          isReadOnly: false,
          activeModules: defaultModules,
          isLegacy: true
        });
      }

      // Find the most relevant subscription (for simplicity, we assume one active/latest subscription per tenant)
      // Sort by descending endDate if multiple exist.
      const subscriptions = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as any as TenantSubscription));
      subscriptions.sort((a, b) => b.endDate - a.endDate);
      const currentSub = subscriptions[0];

      // Fetch the associated Plan
      const planDoc = await getDoc(doc(db, 'subscription_plans', currentSub.planId));
      let plan: SubscriptionPlan | undefined;
      let activeModules: string[] = [];

      if (planDoc.exists()) {
        plan = { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;
        activeModules = plan.includedModules || [];
      }

      const now = Date.now();
      let isSubscriptionActive = false;
      let isReadOnly = false;

      switch (currentSub.status) {
        case 'ACTIVE':
        case 'TRIAL':
          if (now > currentSub.gracePeriodEndDate) {
            isSubscriptionActive = false;
            isReadOnly = true; // Hard expired after grace
          } else if (now > currentSub.endDate) {
            isSubscriptionActive = true;
            isReadOnly = false; // Still in grace period, maybe display a warning
          } else {
            isSubscriptionActive = true;
            isReadOnly = false;
          }
          break;
        case 'EXPIRING':
          if (now > currentSub.gracePeriodEndDate) {
             isSubscriptionActive = false;
             isReadOnly = true;
          } else {
             isSubscriptionActive = true;
             isReadOnly = false;
          }
          break;
        case 'EXPIRED':
        case 'SUSPENDED':
        case 'CANCELLED':
        case 'ARCHIVED':
          isSubscriptionActive = false;
          isReadOnly = true;
          break;
        default:
          isSubscriptionActive = false;
          isReadOnly = true;
          break;
      }

      return ok({
        tenantId,
        isSubscriptionActive,
        isReadOnly,
        activeModules,
        plan,
        subscription: currentSub,
        isLegacy: false
      });
    } catch (error: any) {
      console.error("Error evaluating entitlement:", error);
      return fail(error.message || 'Failed to evaluate entitlement.');
    }
  }

  async hasModuleAccess(tenantId: string, module: string, context: SecurityContext): Promise<Result<boolean>> {
    const entitlementRes = await this.getTenantEntitlement(tenantId, context);
    if (entitlementRes.isFailure) return fail(entitlementRes.getError());

    return ok(entitlementRes.getValue().activeModules.includes(module));
  }

  async isReadOnly(tenantId: string, context: SecurityContext): Promise<Result<boolean>> {
    const entitlementRes = await this.getTenantEntitlement(tenantId, context);
    if (entitlementRes.isFailure) return fail(entitlementRes.getError());

    return ok(entitlementRes.getValue().isReadOnly);
  }
}

export const entitlementService = new EntitlementService();
