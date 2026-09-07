import { IRegistryEngine, RegistryItem, RegistryItemType } from './types';

/**
 * Registry Engine (Foundation Layer)
 * 
 * Provides a centralized registry for services, modules, AI providers, workflows,
 * rules, knowledge providers, plugins, and features. Supports lazy loading and
 * dependency resolution.
 */
class RegistryEngine implements IRegistryEngine {
  private static instance: RegistryEngine;
  private registry: Map<string, RegistryItem<any>> = new Map();

  private constructor() {}

  public static getInstance(): RegistryEngine {
    if (!RegistryEngine.instance) {
      RegistryEngine.instance = new RegistryEngine();
    }
    return RegistryEngine.instance;
  }

  public register<T>(item: Omit<RegistryItem<T>, 'status'>): void {
    if (this.registry.has(item.id)) {
      console.warn(`[RegistryEngine] Item with id ${item.id} is already registered. Overwriting.`);
    }

    this.registry.set(item.id, {
      ...item,
      status: item.instance ? 'ready' : 'registered',
    });
  }

  public resolve<T>(id: string): T | Promise<T> {
    const item = this.registry.get(id) as RegistryItem<T>;
    
    if (!item) {
      throw new Error(`[RegistryEngine] Item with id ${id} not found in registry.`);
    }

    if (item.instance) {
      return item.instance;
    }

    if (item.factory) {
      if (item.status === 'loading') {
        // In a real implementation, we might want to return a shared promise here
        // to avoid calling the factory multiple times.
        console.warn(`[RegistryEngine] Item ${id} is already loading.`);
      }

      item.status = 'loading';
      
      try {
        const instanceOrPromise = item.factory();
        
        if (instanceOrPromise instanceof Promise) {
          return instanceOrPromise.then(instance => {
            item.instance = instance;
            item.status = 'ready';
            return instance;
          }).catch(err => {
            item.status = 'error';
            throw err;
          });
        } else {
          item.instance = instanceOrPromise;
          item.status = 'ready';
          return instanceOrPromise;
        }
      } catch (err) {
        item.status = 'error';
        throw err;
      }
    }

    throw new Error(`[RegistryEngine] Item with id ${id} has neither instance nor factory.`);
  }

  public resolveAll<T>(type: RegistryItemType): (T | Promise<T>)[] {
    const results: (T | Promise<T>)[] = [];
    for (const [id, item] of this.registry.entries()) {
      if (item.type === type) {
        results.push(this.resolve<T>(id));
      }
    }
    return results;
  }

  public has(id: string): boolean {
    return this.registry.has(id);
  }

  public getStatus(id: string): RegistryItem['status'] | undefined {
    return this.registry.get(id)?.status;
  }
}

export const registryEngine = RegistryEngine.getInstance();
