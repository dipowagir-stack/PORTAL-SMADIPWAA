export type ModuleStatus = 'ACTIVE' | 'BETA' | 'DEPRECATED' | 'ARCHIVED';

export interface PlatformModule {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ModuleStatus;
  version: string;
  minPlatformVersion?: string;
  dependencies: string[]; // array of module codes
  defaultEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TenantModuleStatus = 'ENABLED' | 'DISABLED' | 'SUSPENDED' | 'EXPIRED';

export interface TenantModule {
  id: string;
  tenantId: string;
  moduleId: string; // references PlatformModule.code
  status: TenantModuleStatus;
  enabledAt?: number;
  disabledAt?: number;
  source: 'SUBSCRIPTION' | 'MANUAL' | 'LEGACY';
  version?: string;
}

export type FeatureFlagTargetType = 'GLOBAL' | 'TENANT' | 'ROLE' | 'USER';
export type FeatureFlagStatus = 'ACTIVE' | 'INACTIVE';

export interface FeatureFlag {
  id: string;
  key: string;
  moduleId: string;
  defaultValue: boolean;
  targetType: FeatureFlagTargetType;
  status: FeatureFlagStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TenantFeatureOverride {
  id: string;
  tenantId: string;
  featureKey: string;
  value: boolean;
}
