import { SubscriptionStatus } from '../tenant/subscriptionTypes';
import { ReleaseChannel } from '../release/types';

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'BLOCKED' | 'UNKNOWN';

export interface ModuleHealth {
  moduleCode: string;
  status: 'ENABLED' | 'DISABLED' | 'BLOCKED' | 'UNKNOWN';
  entitlement: boolean;
  missingDependencies: string[];
  version?: string;
  compatibility: 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
}

export interface ReleaseHealth {
  currentVersion?: string;
  applicableRelease?: string;
  minimumSupportedVersion?: string;
  releaseChannel: ReleaseChannel;
  updateRequired: boolean;
  migrationRequired: boolean;
  status: 'CURRENT' | 'UPDATE_AVAILABLE' | 'MIGRATION_REQUIRED' | 'UNSUPPORTED';
}

export interface ConfigurationHealth {
  status: 'READY' | 'INCOMPLETE' | 'INVALID';
  missingRequiredSettings: string[];
  invalidSettings: string[];
}

export interface TenantHealth {
  tenantId: string;
  status: HealthStatus;
  subscriptionStatus: SubscriptionStatus;
  moduleHealth: ModuleHealth[];
  releaseHealth: ReleaseHealth;
  configurationStatus: ConfigurationHealth;
  lastSuccessfulCheck?: number;
  lastError?: string;
  updatedAt: number;
}

export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type IssueCategory = 'SUBSCRIPTION' | 'MODULE' | 'RELEASE' | 'CONFIGURATION' | 'OPERATIONAL' | 'SECURITY';

export interface TenantIssue {
  id: string;
  tenantId: string;
  category: IssueCategory;
  severity: Severity;
  message: string;
  status: IssueStatus;
  createdAt: number;
  resolvedAt?: number;
}

export interface PlatformHealthMetadata {
  currentReleaseVersion: string;
  releaseStatus: 'STABLE' | 'ROLLING' | 'MAINTENANCE' | 'INCIDENT';
  maintenanceMode: boolean;
  activeFeatureCount: number;
  globalErrorStatus: HealthStatus;
  lastCheck: number;
}
