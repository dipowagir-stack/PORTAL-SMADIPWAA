import React, { useEffect, useState } from 'react';
import { useTenant } from '../foundation/tenant/TenantContext';
import { featureFlagService } from '../foundation/modules/FeatureFlagService';

interface FeatureFlagGuardProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlagGuard({ featureKey, children, fallback = null }: FeatureFlagGuardProps) {
  const { securityContext } = useTenant();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkFlag = async () => {
      const tenantId = securityContext?.tenantId;
      const res = await featureFlagService.isFeatureEnabled(featureKey, tenantId);
      if (isMounted) {
        setEnabled(res.isSuccess ? res.getValue() : false);
      }
    };
    checkFlag();
  }, [featureKey, securityContext]);

  if (enabled === null) return null; // Or a subtle loader

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
