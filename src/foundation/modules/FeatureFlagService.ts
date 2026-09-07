import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { FeatureFlag, TenantFeatureOverride } from './types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export class FeatureFlagService {
  async getFeatureFlags(): Promise<Result<FeatureFlag[]>> {
    try {
      const snap = await getDocs(collection(db, 'feature_flags'));
      const flags = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeatureFlag));
      return ok(flags);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch feature flags');
    }
  }

  async getTenantOverrides(tenantId: string): Promise<Result<TenantFeatureOverride[]>> {
    try {
      const q = query(collection(db, 'tenant_feature_overrides'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const overrides = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TenantFeatureOverride));
      return ok(overrides);
    } catch (error: any) {
      return fail(error.message || 'Failed to fetch tenant feature overrides');
    }
  }

  async isFeatureEnabled(featureKey: string, tenantId?: string): Promise<Result<boolean>> {
    try {
      const qFlag = query(collection(db, 'feature_flags'), where('key', '==', featureKey), where('status', '==', 'ACTIVE'));
      const snapFlag = await getDocs(qFlag);
      if (snapFlag.empty) return ok(false); // Default to false if not found or inactive
      
      const flag = snapFlag.docs[0].data() as FeatureFlag;
      
      if (!tenantId || flag.targetType === 'GLOBAL') {
        return ok(flag.defaultValue);
      }

      const qOverride = query(collection(db, 'tenant_feature_overrides'), where('tenantId', '==', tenantId), where('featureKey', '==', featureKey));
      const snapOverride = await getDocs(qOverride);

      if (!snapOverride.empty) {
        const override = snapOverride.docs[0].data() as TenantFeatureOverride;
        return ok(override.value);
      }

      return ok(flag.defaultValue);
    } catch (error: any) {
      return fail(error.message || 'Failed to check feature flag');
    }
  }
}

export const featureFlagService = new FeatureFlagService();
