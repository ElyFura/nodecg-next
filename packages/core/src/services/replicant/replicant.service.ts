/**
 * Replicant Service
 * Business logic layer for Replicants with caching, validation, and real-time updates
 */

import { EventEmitter } from 'events';
import type { Redis } from 'ioredis';
import type { ZodSchema } from 'zod';
import { ReplicantRepository } from '../../database/repositories/replicant.repository.js';

export interface ReplicantOptions<T = unknown> {
  defaultValue?: T;
  persistent?: boolean;
  schema?: ZodSchema<T>;
}

export interface ReplicantValue<T = unknown> {
  value: T;
  revision: number;
  namespace: string;
  name: string;
  updatedAt: Date;
}

/**
 * Replicant Service - Manages replicant state with caching and real-time sync
 */
export class ReplicantService extends EventEmitter {
  private repository: ReplicantRepository;
  private redis: Redis;
  private schemas: Map<string, ZodSchema> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // key -> Set<clientId>

  constructor(repository: ReplicantRepository, redis: Redis) {
    super();
    this.repository = repository;
    this.redis = redis;
  }

  /**
   * Get replicant key for Redis
   */
  private getRedisKey(namespace: string, name: string): string {
    return `replicant:${namespace}:${name}`;
  }

  /**
   * Get subscription key
   */
  private getSubscriptionKey(namespace: string, name: string): string {
    return `${namespace}:${name}`;
  }

  /**
   * Register a schema for validation
   */
  registerSchema<T>(namespace: string, name: string, schema: ZodSchema<T>): void {
    const key = this.getSubscriptionKey(namespace, name);
    this.schemas.set(key, schema);
  }

  /**
   * Validate value against registered schema
   */
  private validateValue<T>(namespace: string, name: string, value: T): T {
    const key = this.getSubscriptionKey(namespace, name);
    const schema = this.schemas.get(key);

    if (schema) {
      return schema.parse(value) as T;
    }

    return value;
  }

  /**
   * Get a replicant value (with caching)
   */
  async get<T = unknown>(namespace: string, name: string): Promise<ReplicantValue<T> | null> {
    const redisKey = this.getRedisKey(namespace, name);

    // Try cache first
    const cached = await this.redis.get(redisKey);
    if (cached) {
      return JSON.parse(cached) as ReplicantValue<T>;
    }

    // Fallback to database
    const replicant = await this.repository.findByNamespaceAndName(namespace, name);
    if (!replicant) {
      return null;
    }

    const result: ReplicantValue<T> = {
      value: replicant.value as T,
      revision: replicant.revision,
      namespace: replicant.namespace,
      name: replicant.name,
      updatedAt: replicant.updatedAt,
    };

    // Cache for 5 minutes
    await this.redis.setex(redisKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * Set a replicant value (with validation and caching)
   */
  async set<T = unknown>(namespace: string, name: string, value: T): Promise<ReplicantValue<T>> {
    // Validate if schema is registered
    const validatedValue = this.validateValue(namespace, name, value);

    // Get current replicant or create new
    let replicant = await this.repository.findByNamespaceAndName(namespace, name);
    const isNew = !replicant;

    if (isNew) {
      // Create new replicant
      replicant = await this.repository.create({
        namespace,
        name,
        value: validatedValue as any,
      });
    } else {
      // Update existing replicant (we know replicant is not null here)
      replicant = await this.repository.update(replicant!.id, {
        value: validatedValue as any,
      });
    }

    const result: ReplicantValue<T> = {
      value: validatedValue,
      revision: replicant.revision,
      namespace: replicant.namespace,
      name: replicant.name,
      updatedAt: replicant.updatedAt,
    };

    // Update cache
    const redisKey = this.getRedisKey(namespace, name);
    await this.redis.setex(redisKey, 300, JSON.stringify(result));

    // Emit change event for real-time sync
    this.emitChange(namespace, name, result, isNew ? 'create' : 'update');

    return result;
  }

  /**
   * Delete a replicant
   */
  async delete(namespace: string, name: string): Promise<boolean> {
    const replicant = await this.repository.findByNamespaceAndName(namespace, name);
    if (!replicant) {
      return false;
    }

    await this.repository.delete(replicant.id);

    // Remove from cache
    const redisKey = this.getRedisKey(namespace, name);
    await this.redis.del(redisKey);

    // Emit delete event
    this.emitChange(namespace, name, null, 'delete');

    return true;
  }

  /**
   * Get all replicants in a namespace
   */
  async getNamespace<T = unknown>(namespace: string): Promise<ReplicantValue<T>[]> {
    const replicants = await this.repository.findByNamespace(namespace);

    return replicants.map((r) => ({
      value: r.value as T,
      revision: r.revision,
      namespace: r.namespace,
      name: r.name,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Subscribe to replicant changes
   */
  subscribe(namespace: string, name: string, clientId: string): void {
    const key = this.getSubscriptionKey(namespace, name);
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(clientId);
  }

  /**
   * Unsubscribe from replicant changes
   */
  unsubscribe(namespace: string, name: string, clientId: string): void {
    const key = this.getSubscriptionKey(namespace, name);
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(key);
      }
    }
  }

  /**
   * Unsubscribe client from all replicants
   */
  unsubscribeAll(clientId: string): void {
    for (const [key, subscribers] of this.subscriptions.entries()) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(key);
      }
    }
  }

  /**
   * Get subscribers for a replicant
   */
  getSubscribers(namespace: string, name: string): string[] {
    const key = this.getSubscriptionKey(namespace, name);
    const subscribers = this.subscriptions.get(key);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Emit change event to subscribers
   */
  private emitChange<T>(
    namespace: string,
    name: string,
    value: ReplicantValue<T> | null,
    operation: 'create' | 'update' | 'delete'
  ): void {
    const key = this.getSubscriptionKey(namespace, name);
    const subscribers = this.subscriptions.get(key);

    if (subscribers && subscribers.size > 0) {
      this.emit('change', {
        namespace,
        name,
        value,
        operation,
        subscribers: Array.from(subscribers),
      });
    }
  }

  /**
   * Clear cache for a replicant
   */
  async clearCache(namespace: string, name: string): Promise<void> {
    const redisKey = this.getRedisKey(namespace, name);
    await this.redis.del(redisKey);
  }

  /**
   * Clear all replicant caches
   */
  async clearAllCaches(): Promise<void> {
    const keys = await this.redis.keys('replicant:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get replicant history
   */
  async getHistory(
    namespace: string,
    name: string,
    limit?: number
  ): Promise<Array<{ value: unknown; changedAt: Date; changedBy: string | null }>> {
    const replicant = await this.repository.findByNamespaceAndName(namespace, name);
    if (!replicant) {
      return [];
    }

    const history = await this.repository.getHistory(replicant.id, limit);
    return history.map((h) => ({
      value: h.value,
      changedAt: h.changedAt,
      changedBy: h.changedBy,
    }));
  }
}
