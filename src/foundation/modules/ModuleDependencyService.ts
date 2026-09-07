import { Result, ok, fail } from '../core/Result';
import { PlatformModule } from './types';
import { moduleCatalogService } from './ModuleCatalogService';

export class ModuleDependencyService {
  async validateDependencies(moduleCode: string, activeModules: string[]): Promise<Result<boolean>> {
    const res = await moduleCatalogService.getModuleByCode(moduleCode);
    if (res.isFailure) return fail(res.getError());
    const mod = res.getValue();
    if (!mod) return fail('Module not found');

    if (!mod.dependencies || mod.dependencies.length === 0) {
      return ok(true);
    }

    const missingDependencies = mod.dependencies.filter(dep => !activeModules.includes(dep));
    if (missingDependencies.length > 0) {
      return fail(`Missing dependencies: ${missingDependencies.join(', ')}`);
    }

    return ok(true);
  }
}

export const moduleDependencyService = new ModuleDependencyService();
