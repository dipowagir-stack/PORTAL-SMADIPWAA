import { Result, ok, fail } from '../core/Result';
import { 
  PlatformRelease, 
  AppVersionInfo, 
  UpdateAvailability, 
  ReleaseChannel,
  IReleaseRepository,
  ReleaseStatus
} from './types';
import { PlatformReleaseRepositoryImpl } from './PlatformReleaseRepository';
import { configEngine } from '../config/ConfigurationEngine';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export class VersionService {
  private static instance: VersionService;
  private repository: IReleaseRepository;

  private currentVersionInfo: AppVersionInfo = {
    currentVersion: '1.0.0', // This would typically come from package.json/build inject
    buildNumber: 1,
    releaseChannel: ReleaseChannel.STABLE,
  };

  private constructor() {
    this.repository = new PlatformReleaseRepositoryImpl();
    
    // Attempt to load from AppConfig if dynamic
    const appConfig = configEngine.getAppConfig();
    if (appConfig?.version) {
      this.currentVersionInfo.currentVersion = appConfig.version;
    }
  }

  public static getInstance(): VersionService {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService();
    }
    return VersionService.instance;
  }

  private async isSuperAdmin(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && (userDoc.data().role === 'super_admin' || userDoc.data().role === 'platform_admin')) {
      return true;
    }
    return false;
  }

  public async getCurrentClientVersion(): Promise<Result<AppVersionInfo>> {
    return ok({ ...this.currentVersionInfo });
  }

  public async getLatestPlatformRelease(channel: ReleaseChannel = this.currentVersionInfo.releaseChannel): Promise<Result<PlatformRelease>> {
    return this.repository.getLatestRelease(channel);
  }

  public async isUpdateAvailable(): Promise<Result<UpdateAvailability>> {
    try {
      const latestResult = await this.getLatestPlatformRelease();
      
      if (!latestResult.isSuccess || !latestResult.getValue()) {
        // No release found, so no update available
        return ok({
          updateAvailable: false,
          forceUpdate: false
        });
      }

      const latestRelease = latestResult.getValue();
      const currentVerStr = this.currentVersionInfo.currentVersion;
      
      // Simple semver comparison (assuming x.y.z)
      const isNewer = this.compareVersions(latestRelease.version, currentVerStr) > 0;
      const isForceUpdate = this.compareVersions(latestRelease.minimumClientVersion, currentVerStr) > 0;

      return ok({
        updateAvailable: isNewer,
        forceUpdate: isForceUpdate,
        latestVersion: latestRelease.version,
        releaseNotes: latestRelease.releaseNotes
      });
    } catch (error: any) {
      return fail(`Failed to check for updates: ${error.message}`);
    }
  }

  public async getReleaseNotes(version: string): Promise<Result<string>> {
    const releaseResult = await this.repository.getReleaseByVersion(version);
    if (releaseResult.isSuccess && releaseResult.getValue()) {
      return ok(releaseResult.getValue().releaseNotes);
    }
    return fail(`Release notes for version ${version} not found`);
  }

  public async createRelease(releaseData: Partial<PlatformRelease>): Promise<Result<PlatformRelease>> {
    const isAdmin = await this.isSuperAdmin();
    if (!isAdmin) {
      return fail('UNAUTHORIZED: Only Platform Admin can create releases');
    }

    const newRelease: PlatformRelease = {
      id: `rel_${Date.now()}`,
      version: releaseData.version || '1.0.0',
      buildNumber: releaseData.buildNumber || 1,
      status: releaseData.status || ReleaseStatus.DRAFT,
      releaseChannel: releaseData.releaseChannel || ReleaseChannel.STABLE,
      releaseNotes: releaseData.releaseNotes || '',
      minimumClientVersion: releaseData.minimumClientVersion || '1.0.0',
      applicabilityScope: releaseData.applicabilityScope || 'GLOBAL' as any,
      maintenanceMode: releaseData.maintenanceMode || false,
      migrationRequired: releaseData.migrationRequired || false,
      createdAt: Date.now(),
      createdBy: auth.currentUser?.uid || 'system',
      updatedAt: Date.now(),
      updatedBy: auth.currentUser?.uid || 'system',
      ...releaseData
    };

    return this.repository.createRelease(newRelease);
  }

  public async publishRelease(id: string): Promise<Result<PlatformRelease>> {
    const isAdmin = await this.isSuperAdmin();
    if (!isAdmin) {
      return fail('UNAUTHORIZED: Only Platform Admin can publish releases');
    }
    return this.repository.updateReleaseStatus(id, ReleaseStatus.RELEASED, auth.currentUser?.uid || 'system');
  }

  public async rollbackRelease(id: string): Promise<Result<PlatformRelease>> {
    const isAdmin = await this.isSuperAdmin();
    if (!isAdmin) {
      return fail('UNAUTHORIZED: Only Platform Admin can rollback releases');
    }
    return this.repository.updateReleaseStatus(id, ReleaseStatus.ROLLED_BACK, auth.currentUser?.uid || 'system');
  }

  /**
   * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

export const versionService = VersionService.getInstance();
