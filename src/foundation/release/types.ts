import { Result } from '../core/Result';

export enum ReleaseStatus {
  DRAFT = 'DRAFT',
  TESTING = 'TESTING',
  STAGED = 'STAGED',
  RELEASED = 'RELEASED',
  ROLLED_BACK = 'ROLLED_BACK',
  ARCHIVED = 'ARCHIVED'
}

export enum ReleaseChannel {
  STABLE = 'STABLE',
  BETA = 'BETA',
  INTERNAL = 'INTERNAL'
}

export enum TenantApplicabilityScope {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
  PLAN = 'PLAN',
  MODULE = 'MODULE',
  RELEASE_CHANNEL = 'RELEASE_CHANNEL'
}

export interface ModuleReleaseInfo {
  moduleCode: string;
  moduleVersion: string;
  minimumPlatformVersion?: string;
}

export interface PlatformRelease {
  id: string;
  version: string;
  buildNumber: number;
  releaseDate?: number;
  status: ReleaseStatus;
  releaseChannel: ReleaseChannel;
  releaseNotes: string;
  minimumClientVersion: string;
  
  // Applicability & Rollout
  applicabilityScope: TenantApplicabilityScope;
  targetTenants?: string[]; // If scope is TENANT
  targetPlans?: string[];   // If scope is PLAN
  
  // Module Integration
  modules?: ModuleReleaseInfo[];
  
  // Maintenance & Migration
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceStart?: number;
  maintenanceEnd?: number;

  migrationRequired: boolean;
  migrationVersion?: string;
  minimumSchemaVersion?: string;
  
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export interface AppVersionInfo {
  currentVersion: string;
  buildNumber: number;
  releaseChannel: ReleaseChannel;
}

export interface UpdateAvailability {
  updateAvailable: boolean;
  forceUpdate: boolean;
  latestVersion?: string;
  releaseNotes?: string;
}

export interface IReleaseRepository {
  getLatestRelease(channel: ReleaseChannel): Promise<Result<PlatformRelease>>;
  getReleaseByVersion(version: string): Promise<Result<PlatformRelease>>;
  createRelease(release: PlatformRelease): Promise<Result<PlatformRelease>>;
  updateReleaseStatus(id: string, status: ReleaseStatus, updatedBy: string): Promise<Result<PlatformRelease>>;
  getAllReleases(): Promise<Result<PlatformRelease[]>>;
}
