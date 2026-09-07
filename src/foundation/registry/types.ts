export type RegistryItemType = 
  | 'service'
  | 'module'
  | 'ai_provider'
  | 'workflow'
  | 'rule'
  | 'knowledge_provider'
  | 'plugin'
  | 'feature';

export interface RegistryItemMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  lazy?: boolean;
}

export interface RegistryItem<T = any> {
  id: string;
  type: RegistryItemType;
  metadata: RegistryItemMetadata;
  instance?: T;
  factory?: () => T | Promise<T>;
  status: 'registered' | 'loading' | 'ready' | 'error';
}

export interface IRegistryEngine {
  register<T>(item: Omit<RegistryItem<T>, 'status'>): void;
  resolve<T>(id: string): T | Promise<T>;
  resolveAll<T>(type: RegistryItemType): (T | Promise<T>)[];
  has(id: string): boolean;
  getStatus(id: string): RegistryItem['status'] | undefined;
}
