export interface BaseRepository<T> {
  exists(id: string): Promise<boolean>;
  save(t: T): Promise<T>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
}
