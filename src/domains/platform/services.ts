import { Result, ok, fail } from '../../foundation/core/Result';
import { TenantSummary, IPlatformHubService, SaasWebsiteConfig } from './types';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, setDoc } from 'firebase/firestore';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export class PlatformHubService implements IPlatformHubService {
  
  async getAllTenants(): Promise<Result<TenantSummary[]>> {
    try {
      if (virtualDatabase.isActive()) {
        const tenants = await virtualDatabase.getDocs('tenants');
        const subscriptions = await virtualDatabase.getDocs('tenant_subscriptions');
        
        const summaries: TenantSummary[] = tenants.map((t: any) => {
           const sub = subscriptions.find((s: any) => s.tenantId === t.id);
           return {
             id: t.id,
             name: t.name || 'Unknown',
             code: t.domainPrefix || t.id,
             status: t.status || 'ACTIVE',
             subscriptionPlan: sub?.planId || 'free',
             subscriptionStatus: sub?.status || 'ACTIVE',
             expiryDate: sub?.currentPeriodEnd || 0,
             activeModules: t.entitlements || [],
             currentVersion: t.currentVersion || '1.0.0',
             releaseChannel: t.releaseChannel || 'STABLE',
             createdAt: t.createdAt || 0,
             lastActivity: t.updatedAt || 0
           };
        });
        return ok(summaries);
      }

      const tenantsSnap = await getDocs(collection(db, 'tenants'));
      const subsSnap = await getDocs(collection(db, 'tenant_subscriptions'));
      
      const subscriptions = subsSnap.docs.map(d => ({id: d.id, ...d.data()}));
      
      const summaries: TenantSummary[] = tenantsSnap.docs.map(tDoc => {
        const t = tDoc.data();
        const sub: any = subscriptions.find((s: any) => s.tenantId === tDoc.id);
        
        return {
           id: tDoc.id,
           name: t.name || 'Unknown',
           code: t.domainPrefix || tDoc.id,
           status: t.status || 'ACTIVE',
           subscriptionPlan: sub?.planId || 'free',
           subscriptionStatus: sub?.status || 'ACTIVE',
           expiryDate: sub?.currentPeriodEnd || 0,
           activeModules: t.entitlements || [],
           currentVersion: t.currentVersion || '1.0.0',
           releaseChannel: t.releaseChannel || 'STABLE',
           createdAt: t.createdAt || 0,
           lastActivity: t.updatedAt || 0
        };
      });
      
      return ok(summaries);
    } catch (e: any) {
      return fail(`Failed to get tenants: ${e.message}`);
    }
  }

  async getTenantDetails(tenantId: string): Promise<Result<TenantSummary>> {
    try {
       // Just reuse getAllTenants for now
       const all = await this.getAllTenants();
       if (all.isFailure) return fail(all.getError());
       
       const tenant = all.getValue().find(t => t.id === tenantId);
       if (!tenant) return fail('Tenant not found');
       
       return ok(tenant);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async suspendTenant(tenantId: string, reason: string): Promise<Result<void>> {
    try {
      if (virtualDatabase.isActive()) {
        await virtualDatabase.updateDoc('tenants', tenantId, { status: 'SUSPENDED', suspendReason: reason, updatedAt: Date.now() });
        return ok(undefined);
      }
      
      await updateDoc(doc(db, 'tenants', tenantId), {
        status: 'SUSPENDED',
        suspendReason: reason,
        updatedAt: Date.now()
      });
      return ok(undefined);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async restoreTenant(tenantId: string): Promise<Result<void>> {
    try {
      if (virtualDatabase.isActive()) {
        await virtualDatabase.updateDoc('tenants', tenantId, { status: 'ACTIVE', suspendReason: null, updatedAt: Date.now() });
        return ok(undefined);
      }
      
      await updateDoc(doc(db, 'tenants', tenantId), {
        status: 'ACTIVE',
        suspendReason: null,
        updatedAt: Date.now()
      });
      return ok(undefined);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async createTenant(data: { name: string; domainPrefix: string; email: string; subscriptionPlan: string }): Promise<Result<string>> {
    try {
      const tenantData = {
        name: data.name,
        domainPrefix: data.domainPrefix,
        email: data.email,
        status: 'ACTIVE',
        currentVersion: '1.0.0',
        releaseChannel: 'STABLE',
        entitlements: ['academic', 'student', 'teacher', 'admin'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      let newTenantId = '';

      if (virtualDatabase.isActive()) {
        newTenantId = 't_' + Math.random().toString(36).substring(2, 9);
        await virtualDatabase.setDoc('tenants', newTenantId, tenantData);
        
        await virtualDatabase.setDoc('tenant_subscriptions', 'sub_' + newTenantId, {
          tenantId: newTenantId,
          planId: data.subscriptionPlan,
          status: 'ACTIVE',
          currentPeriodStart: Date.now(),
          currentPeriodEnd: Date.now() + 31536000000 // 1 year
        });
        
        return ok(newTenantId);
      }

      // Add to live firestore
      
      const docRef = await addDoc(collection(db, 'tenants'), tenantData);
      newTenantId = docRef.id;

      await addDoc(collection(db, 'tenant_subscriptions'), {
        tenantId: newTenantId,
        planId: data.subscriptionPlan,
        status: 'ACTIVE',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 31536000000 // 1 year
      });

      return ok(newTenantId);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async updateTenantModules(tenantId: string, modules: string[]): Promise<Result<void>> {
    try {
      if (virtualDatabase.isActive()) {
        await virtualDatabase.updateDoc('tenants', tenantId, { entitlements: modules, updatedAt: Date.now() });
        return ok(undefined);
      }
      
      await updateDoc(doc(db, 'tenants', tenantId), { entitlements: modules, updatedAt: Date.now() });
      return ok(undefined);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async updateTenantSubscription(tenantId: string, planId: string): Promise<Result<void>> {
    try {
      if (virtualDatabase.isActive()) {
        const subs = await virtualDatabase.getDocs('tenant_subscriptions');
        const sub = subs.find((s: any) => s.tenantId === tenantId);
        if (sub) {
          await virtualDatabase.updateDoc('tenant_subscriptions', sub.id, { planId, updatedAt: Date.now() });
        }
        return ok(undefined);
      }
      
      const q = query(collection(db, 'tenant_subscriptions'), where('tenantId', '==', tenantId));
      const subsSnap = await getDocs(q);
      if (!subsSnap.empty) {
        await updateDoc(subsSnap.docs[0].ref, { planId, updatedAt: Date.now() });
      }
      return ok(undefined);
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async getSaasWebsiteConfig(): Promise<Result<SaasWebsiteConfig>> {
    try {
      if (virtualDatabase.isActive()) {
        const config = await virtualDatabase.getDoc('platform_settings', 'saas_website');
        if (config) return ok(config as SaasWebsiteConfig);
        return fail('Config not found in virtual database');
      }

      const docRef = doc(db, 'platform_settings', 'saas_website');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return ok(docSnap.data() as SaasWebsiteConfig);
      }
      return fail('SaaS Website Config not found');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  async updateSaasWebsiteConfig(config: Partial<SaasWebsiteConfig>): Promise<Result<void>> {
    try {
      if (virtualDatabase.isActive()) {
        const current = await virtualDatabase.getDoc('platform_settings', 'saas_website');
        if (current) {
           await virtualDatabase.updateDoc('platform_settings', 'saas_website', { ...config, updatedAt: Date.now() });
        } else {
           await virtualDatabase.setDoc('platform_settings', 'saas_website', { ...config, updatedAt: Date.now() });
        }
        return ok(undefined);
      }

      const docRef = doc(db, 'platform_settings', 'saas_website');
      await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
      return ok(undefined);
    } catch (e: any) {
      return fail(e.message);
    }
  }
}

export const platformHubService = new PlatformHubService();
