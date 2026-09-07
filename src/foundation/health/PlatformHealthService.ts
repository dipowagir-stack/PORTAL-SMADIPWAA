import { Result, ok, fail } from '../core/Result';
import { PlatformHealthMetadata, HealthStatus } from './types';
import { versionService } from '../release/VersionService';
import { configEngine } from '../config/ConfigurationEngine';
import { SecurityContext } from '../security/types';

export class PlatformHealthService {
  private static instance: PlatformHealthService;

  private constructor() {}

  public static getInstance(): PlatformHealthService {
    if (!PlatformHealthService.instance) {
      PlatformHealthService.instance = new PlatformHealthService();
    }
    return PlatformHealthService.instance;
  }

  public async getPlatformHealth(context: SecurityContext): Promise<Result<PlatformHealthMetadata>> {
    if (!context.isPlatformAdmin) {
       // Is support?
       if (!context.roles?.includes('platform_support')) {
          return fail('Unauthorized: Only Platform Admin or Support can view platform health.');
       }
    }

    try {
      // 1. Get Release Version
      const currentClientRes = await versionService.getCurrentClientVersion();
      const currentVersion = currentClientRes.isSuccess ? currentClientRes.getValue().currentVersion : 'unknown';
      
      // 2. Feature Flags
      const config = configEngine.getConfig();
      const activeFeatureCount = Object.values(config.features).filter(Boolean).length;

      // 3. Evaluate Status
      // Mocked global error status for now
      const globalErrorStatus: HealthStatus = 'HEALTHY';
      
      const healthData: PlatformHealthMetadata = {
        currentReleaseVersion: currentVersion,
        releaseStatus: 'STABLE', // Could check latest release status
        maintenanceMode: false,
        activeFeatureCount,
        globalErrorStatus,
        lastCheck: Date.now()
      };

      return ok(healthData);
    } catch (error: any) {
      return fail(error.message || 'Failed to check platform health');
    }
  }
}

export const platformHealthService = PlatformHealthService.getInstance();
