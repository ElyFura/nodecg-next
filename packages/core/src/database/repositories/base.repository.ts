/**
 * Base repository interface defining common CRUD operations
 * All repositories extend this interface for consistency
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BaseRepository<
  T,
  TCreateInput,
  TUpdateInput,
  TFindOptions = any,
  TCountOptions = any,
> {
  /**
   * Find a single record by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all records with optional filtering
   */
  findMany(options?: TFindOptions): Promise<T[]>;

  /**
   * Create a new record
   */
  create(data: TCreateInput): Promise<T>;

  /**
   * Update an existing record by ID
   */
  update(id: string, data: TUpdateInput): Promise<T>;

  /**
   * Delete a record by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Count records with optional filtering
   */
  count(options?: TCountOptions): Promise<number>;

  /**
   * Check if a record exists by ID
   */
  exists(id: string): Promise<boolean>;
}

export interface FindManyOptions<T> {
  where?: Partial<T>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

export interface CountOptions {
  where?: Record<string, unknown>;
}
