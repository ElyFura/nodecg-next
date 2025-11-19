/**
 * Replicant Service
 *
 * Manages all Replicant operations with validation, persistence,
 * and real-time updates. Replicants are synchronized state objects
 * that can be shared between server, dashboard, graphics, and extensions.
 *
 * @module services/replicant
 */

import { BaseService } from '../base.service';
import { EventBus } from '../../utils/event-bus';
import { Logger } from '../../utils/logger';
import { NodeCGConfig } from '@nodecg/types';
import { ZodSchema } from 'zod';
import type { PrismaClient, Replicant as PrismaReplicant } from '../../database/generated/client';
import { ValidationError } from '../../utils/errors';

/**
 * Replicant options for registration
 */
export interface ReplicantOptions<T = any> {
  /** Default value if replicant doesn't exist in database */
  defaultValue?: T;
  /** Whether to persist to database (default: true) */
  persistent?: boolean;
  /** Zod schema for validation */
  schema?: ZodSchema<T>;
  /** Schema as JSON string (for storage) */
  schemaString?: string;
}

/**
 * Replicant change event
 */
export interface ReplicantChangeEvent<T = any> {
  /** Bundle namespace */
  namespace: string;
  /** Replicant name */
  name: string;
  /** New value */
  newValue: T;
  /** Previous value (if any) */
  oldValue?: T;
  /** Revision number */
  revision: number;
  /** Timestamp of change */
  timestamp: number;
  /** User who made the change (if applicable) */
  changedBy?: string;
}

/**
 * Replicant metadata
 */
export interface ReplicantMeta {
  namespace: string;
  name: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  hasSchema: boolean;
}

/**
 * Replicant Service Implementation
 *
 * Provides type-safe, validated, and synchronized state management
 * for NodeCG bundles with real-time updates via WebSocket.
 */
export class ReplicantService extends BaseService {
  private prisma: PrismaClient;
  private cache: Map<string, any> = new Map();
  private schemas: Map<string, ZodSchema> = new Map();
  private subscriptions: Map<string, Set<(event: ReplicantChangeEvent) => void>> = new Map();

  constructor(prisma: PrismaClient, config?: NodeCGConfig, logger?: Logger, eventBus?: EventBus) {
    super('replicant-service', { config, logger, eventBus });
    this.prisma = prisma;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing Replicant Service...');

    // Load all replicants from database into cache
    await this.loadAllFromDatabase();

    this.logger.info('Replicant Service initialized successfully');
  }

  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down Replicant Service...');

    // Clear caches
    this.cache.clear();
    this.schemas.clear();
    this.subscriptions.clear();

    this.logger.info('Replicant Service shut down');
  }

  /**
   * Register a replicant
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @param options - Replicant options
   * @returns Current value
   */
  async register<T>(
    namespace: string,
    name: string,
    options: ReplicantOptions<T> = {}
  ): Promise<T> {
    this.assertInitialized();

    const key = this.getKey(namespace, name);
    this.logger.debug(`Registering replicant: ${key}`);

    // Store schema if provided
    if (options.schema) {
      this.schemas.set(key, options.schema);
    }

    // Check if replicant exists in database
    const dbReplicant = await this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name },
      },
    });

    let value: T;

    if (dbReplicant) {
      // Load from database
      value = JSON.parse(dbReplicant.value);
      this.logger.debug(
        `Loaded replicant ${key} from database (revision: ${dbReplicant.revision})`
      );

      // Validate if schema provided
      if (options.schema) {
        try {
          value = options.schema.parse(value);
        } catch (error) {
          this.logger.warn(`Replicant ${key} failed validation, using default value`);
          if (options.defaultValue !== undefined) {
            value = options.defaultValue;
          } else {
            throw new ValidationError(`Replicant ${key} validation failed`, error);
          }
        }
      }
    } else if (options.defaultValue !== undefined) {
      // Use default value
      value = options.defaultValue;

      // Validate if schema provided
      if (options.schema) {
        value = options.schema.parse(value);
      }

      // Save to database if persistent (default: true)
      if (options.persistent !== false) {
        await this.save(namespace, name, value, options.schemaString);
        this.logger.debug(`Initialized replicant ${key} with default value`);
      }
    } else {
      throw new Error(`Replicant ${key} not found and no default value provided`);
    }

    // Store in cache
    this.cache.set(key, value);

    // Emit registration event
    this.emitEvent('registered', { namespace, name, value });

    return value;
  }

  /**
   * Get replicant value
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @returns Current value or null if not found
   */
  async get<T>(namespace: string, name: string): Promise<T | null> {
    this.assertInitialized();

    const key = this.getKey(namespace, name);

    // Try to get from cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Load from database
    const dbReplicant = await this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name },
      },
    });

    if (!dbReplicant) {
      return null;
    }

    const value = JSON.parse(dbReplicant.value);

    // Store in cache
    this.cache.set(key, value);

    return value;
  }

  /**
   * Set replicant value
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @param value - New value
   * @param changedBy - User who made the change
   * @param validate - Whether to validate against schema (default: true)
   * @returns Success
   */
  async set<T>(
    namespace: string,
    name: string,
    value: T,
    changedBy?: string,
    validate: boolean = true
  ): Promise<boolean> {
    this.assertInitialized();

    const key = this.getKey(namespace, name);
    const oldValue = this.cache.get(key);

    // Validate against schema if exists and validation is enabled
    if (validate) {
      const schema = this.schemas.get(key);
      if (schema) {
        try {
          value = schema.parse(value);
        } catch (error) {
          this.logger.error(`Validation failed for ${key}:`, error);
          throw new ValidationError(`Validation failed for ${key}`, error);
        }
      }
    }

    // Store in cache
    this.cache.set(key, value);

    // Save to database
    const updatedReplicant = await this.save(namespace, name, value, undefined, changedBy);

    // Emit change event
    const changeEvent: ReplicantChangeEvent<T> = {
      namespace,
      name,
      newValue: value,
      oldValue,
      revision: updatedReplicant.revision,
      timestamp: Date.now(),
      changedBy,
    };

    // Emit to event bus
    this.eventBus.emit('replicant:change', changeEvent);
    this.eventBus.emit(`replicant:change:${key}`, changeEvent);

    // Notify subscribers
    this.notifySubscribers(key, changeEvent);

    this.logger.debug(`Replicant ${key} updated to revision ${updatedReplicant.revision}`);

    return true;
  }

  /**
   * Delete a replicant
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   */
  async delete(namespace: string, name: string): Promise<void> {
    this.assertInitialized();

    const key = this.getKey(namespace, name);
    this.logger.debug(`Deleting replicant: ${key}`);

    // Remove from cache
    this.cache.delete(key);
    this.schemas.delete(key);
    this.subscriptions.delete(key);

    // Delete from database (cascade deletes history)
    await this.prisma.replicant.delete({
      where: {
        namespace_name: { namespace, name },
      },
    });

    // Emit deletion event
    this.emitEvent('deleted', { namespace, name });
    this.eventBus.emit('replicant:deleted', { namespace, name });

    this.logger.info(`Replicant ${key} deleted`);
  }

  /**
   * Subscribe to replicant changes
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  subscribe(
    namespace: string,
    name: string,
    callback: (event: ReplicantChangeEvent) => void
  ): () => void {
    const key = this.getKey(namespace, name);

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }

    this.subscriptions.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  /**
   * Get replicant history
   *
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @param limit - Maximum number of history entries (default: 10)
   * @returns History entries
   */
  async getHistory(
    namespace: string,
    name: string,
    limit: number = 10
  ): Promise<
    Array<{
      value: any;
      revision: number;
      changedBy?: string;
      changedAt: Date;
    }>
  > {
    this.assertInitialized();

    const replicant = await this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name },
      },
      select: {
        id: true,
      },
    });

    if (!replicant) {
      return [];
    }

    const history = await this.prisma.replicantHistory.findMany({
      where: {
        replicantId: replicant.id,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
    });

    return history.map((entry: any) => ({
      value: JSON.parse(entry.value),
      revision: entry.revision,
      changedBy: entry.changedBy || undefined,
      changedAt: entry.changedAt,
    }));
  }

  /**
   * Get all replicants for a namespace
   *
   * @param namespace - Bundle namespace
   * @returns Array of replicant metadata
   */
  async getByNamespace(namespace: string): Promise<ReplicantMeta[]> {
    this.assertInitialized();

    const replicants = await this.prisma.replicant.findMany({
      where: { namespace },
      select: {
        namespace: true,
        name: true,
        revision: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return replicants.map((r: any) => ({
      namespace: r.namespace,
      name: r.name,
      revision: r.revision,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasSchema: !!r.schema,
    }));
  }

  /**
   * Get all replicants (admin only)
   *
   * @returns Array of all replicant metadata
   */
  async getAll(): Promise<ReplicantMeta[]> {
    this.assertInitialized();

    const replicants = await this.prisma.replicant.findMany({
      select: {
        namespace: true,
        name: true,
        revision: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return replicants.map((r: any) => ({
      namespace: r.namespace,
      name: r.name,
      revision: r.revision,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasSchema: !!r.schema,
    }));
  }

  /**
   * Save replicant to database
   *
   * @private
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @param value - Value to save
   * @param schemaString - JSON schema string
   * @param changedBy - User who made the change
   * @returns Updated replicant
   */
  private async save<T>(
    namespace: string,
    name: string,
    value: T,
    schemaString?: string,
    changedBy?: string
  ): Promise<PrismaReplicant> {
    const valueJson = JSON.stringify(value);

    // Upsert replicant
    const replicant = await this.prisma.replicant.upsert({
      where: {
        namespace_name: { namespace, name },
      },
      update: {
        value: valueJson,
        revision: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        namespace,
        name,
        value: valueJson,
        schema: schemaString || null,
        revision: 0,
      },
    });

    // Save to history
    await this.prisma.replicantHistory.create({
      data: {
        replicantId: replicant.id,
        value: valueJson,
        revision: replicant.revision,
        changedBy: changedBy || null,
      },
    });

    return replicant;
  }

  /**
   * Load all replicants from database into cache
   *
   * @private
   */
  private async loadAllFromDatabase(): Promise<void> {
    try {
      const replicants = await this.prisma.replicant.findMany();

      for (const replicant of replicants) {
        const key = this.getKey(replicant.namespace, replicant.name);
        const value = JSON.parse(replicant.value);
        this.cache.set(key, value);

        // Load schema if exists
        if (replicant.schema) {
          try {
            // Note: We store schema as string, actual validation requires
            // the bundle to re-register with the Zod schema object
            this.logger.debug(`Replicant ${key} has schema`);
          } catch (error) {
            this.logger.warn(`Failed to load schema for ${key}:`, error);
          }
        }
      }

      this.logger.info(`Loaded ${replicants.length} replicants from database`);
    } catch (error) {
      this.logger.error('Failed to load replicants from database:', error);
      throw error;
    }
  }

  /**
   * Generate cache key
   *
   * @private
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @returns Cache key
   */
  private getKey(namespace: string, name: string): string {
    return `${namespace}:${name}`;
  }

  /**
   * Notify all subscribers of a change
   *
   * @private
   * @param key - Replicant key
   * @param event - Change event
   */
  private notifySubscribers(key: string, event: ReplicantChangeEvent): void {
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          this.logger.error(`Error in replicant subscriber for ${key}:`, error);
        }
      });
    }
  }
}
