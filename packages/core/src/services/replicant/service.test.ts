/**
 * Replicant Service Tests
 *
 * Comprehensive test suite for the ReplicantService including:
 * - Registration and initialization
 * - CRUD operations
 * - Schema validation
 * - Subscriptions
 * - History tracking
 * - Namespace queries
 *
 * **Database Setup Required:**
 * Before running these tests, ensure the database schema is initialized:
 * ```bash
 * cd packages/core
 * pnpm db:setup  # or: npx prisma db push
 * ```
 *
 * Some tests require a properly initialized SQLite database with schema.
 * Without it, tests that query the database directly will fail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { ReplicantService, ReplicantChangeEvent } from './service';
import { getPrismaClient } from '../../database/client';
import { getEventBus } from '../../utils/event-bus';
import { createLogger } from '../../utils/logger';
import { ValidationError } from '../../utils/errors';

describe('ReplicantService', () => {
  let service: ReplicantService;
  let prisma: ReturnType<typeof getPrismaClient>;
  let eventBus: ReturnType<typeof getEventBus>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(async () => {
    logger = createLogger({ level: 'silent' }); // Silent during tests
    prisma = getPrismaClient(logger);
    eventBus = getEventBus();

    service = new ReplicantService(prisma, undefined, logger, eventBus);
    await service.initialize();

    // Clean up any existing test replicants
    await prisma.replicant.deleteMany({
      where: {
        OR: [
          { namespace: 'test' },
          { namespace: 'test-validation' },
          { namespace: 'test-history' },
        ],
      },
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should throw error when accessing uninitialized service', async () => {
      const uninitializedService = new ReplicantService(prisma, undefined, logger, eventBus);
      await expect(uninitializedService.get('test', 'foo')).rejects.toThrow();
    });
  });

  describe('Registration', () => {
    it('should register a new replicant with default value', async () => {
      const value = await service.register<number>('test', 'counter', {
        defaultValue: 0,
      });

      expect(value).toBe(0);
    });

    it('should register a replicant with complex object', async () => {
      const defaultValue = {
        name: 'Alice',
        score: 100,
        tags: ['player', 'active'],
      };

      const value = await service.register('test', 'player', {
        defaultValue,
      });

      expect(value).toEqual(defaultValue);
    });

    it('should load existing replicant from database', async () => {
      // Register first time
      await service.register<number>('test', 'score', { defaultValue: 50 });

      // Update value
      await service.set('test', 'score', 100);

      // Create new service instance (simulates server restart)
      const newService = new ReplicantService(prisma, undefined, logger, eventBus);
      await newService.initialize();

      // Register again - should load from database
      const value = await newService.register<number>('test', 'score', { defaultValue: 50 });
      expect(value).toBe(100);

      await newService.shutdown();
    });

    it('should throw error if replicant not found and no default provided', async () => {
      await expect(service.register('test', 'nonexistent', {})).rejects.toThrow(
        /not found and no default value provided/
      );
    });

    it('should persist replicant to database by default', async () => {
      await service.register<string>('test', 'message', { defaultValue: 'hello' });

      const dbReplicant = await prisma.replicant.findUnique({
        where: {
          namespace_name: { namespace: 'test', name: 'message' },
        },
      });

      expect(dbReplicant).toBeDefined();
      expect(JSON.parse(dbReplicant!.value)).toBe('hello');
    });

    it('should not persist replicant when persistent is false', async () => {
      await service.register<string>('test', 'temp', {
        defaultValue: 'temporary',
        persistent: false,
      });

      const dbReplicant = await prisma.replicant.findUnique({
        where: {
          namespace_name: { namespace: 'test', name: 'temp' },
        },
      });

      expect(dbReplicant).toBeNull();
    });
  });

  describe('Get Operations', () => {
    it('should get replicant value', async () => {
      await service.register<number>('test', 'counter', { defaultValue: 42 });

      const value = await service.get<number>('test', 'counter');
      expect(value).toBe(42);
    });

    it('should return null for non-existent replicant', async () => {
      const value = await service.get('test', 'nonexistent');
      expect(value).toBeNull();
    });

    it('should use cache for subsequent reads', async () => {
      await service.register<number>('test', 'cached', { defaultValue: 100 });

      // First read - from database
      const value1 = await service.get<number>('test', 'cached');

      // Spy on Prisma to ensure it's not called again
      const spy = vi.spyOn(prisma.replicant, 'findUnique');

      // Second read - from cache
      const value2 = await service.get<number>('test', 'cached');

      expect(value1).toBe(100);
      expect(value2).toBe(100);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Set Operations', () => {
    it('should update replicant value', async () => {
      await service.register<number>('test', 'score', { defaultValue: 0 });
      await service.set('test', 'score', 100);

      const value = await service.get<number>('test', 'score');
      expect(value).toBe(100);
    });

    it('should increment revision on update', async () => {
      await service.register<number>('test', 'versioned', { defaultValue: 1 });

      const dbBefore = await prisma.replicant.findUnique({
        where: { namespace_name: { namespace: 'test', name: 'versioned' } },
      });

      await service.set('test', 'versioned', 2);

      const dbAfter = await prisma.replicant.findUnique({
        where: { namespace_name: { namespace: 'test', name: 'versioned' } },
      });

      expect(dbAfter!.revision).toBeGreaterThan(dbBefore!.revision);
    });

    it('should emit change event on update', async () => {
      await service.register<number>('test', 'observable', { defaultValue: 0 });

      const eventPromise = new Promise<ReplicantChangeEvent<number>>((resolve) => {
        eventBus.once('replicant:change', (...args: unknown[]) => {
          resolve(args[0] as ReplicantChangeEvent<number>);
        });
      });

      await service.set('test', 'observable', 50, 'test-user');

      const event = await eventPromise;

      expect(event.namespace).toBe('test');
      expect(event.name).toBe('observable');
      expect(event.oldValue).toBe(0);
      expect(event.newValue).toBe(50);
      expect(event.changedBy).toBe('test-user');
    });

    it('should save to history on update', async () => {
      await service.register<string>('test-history', 'log', { defaultValue: 'v1' });
      await service.set('test-history', 'log', 'v2', 'user1');
      await service.set('test-history', 'log', 'v3', 'user2');

      const history = await service.getHistory('test-history', 'log', 10);

      expect(history).toHaveLength(3);
      expect(history[0].value).toBe('v3'); // Most recent first
      expect(history[0].changedBy).toBe('user2');
      expect(history[1].value).toBe('v2');
      expect(history[2].value).toBe('v1');
    });
  });

  describe('Schema Validation', () => {
    const PlayerSchema = z.object({
      name: z.string().min(1).max(50),
      health: z.number().min(0).max(100),
      level: z.number().int().positive(),
    });

    type Player = z.infer<typeof PlayerSchema>;

    it('should validate on registration with valid value', async () => {
      const player: Player = { name: 'Alice', health: 100, level: 5 };

      const value = await service.register<Player>('test-validation', 'player1', {
        defaultValue: player,
        schema: PlayerSchema,
      });

      expect(value).toEqual(player);
    });

    it('should throw ValidationError on registration with invalid value', async () => {
      const invalidPlayer = { name: '', health: 150, level: -1 }; // Invalid: empty name, health > 100, negative level

      await expect(
        service.register('test-validation', 'player2', {
          defaultValue: invalidPlayer,
          schema: PlayerSchema,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate on set with valid value', async () => {
      await service.register<Player>('test-validation', 'player3', {
        defaultValue: { name: 'Bob', health: 50, level: 1 },
        schema: PlayerSchema,
      });

      await service.set('test-validation', 'player3', { name: 'Bob', health: 75, level: 2 });

      const value = await service.get<Player>('test-validation', 'player3');
      expect(value?.health).toBe(75);
      expect(value?.level).toBe(2);
    });

    it('should throw ValidationError on set with invalid value', async () => {
      await service.register<Player>('test-validation', 'player4', {
        defaultValue: { name: 'Charlie', health: 100, level: 1 },
        schema: PlayerSchema,
      });

      await expect(
        service.set('test-validation', 'player4', {
          name: 'Charlie',
          health: 200, // Invalid: > 100
          level: 1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should skip validation when validate parameter is false', async () => {
      await service.register<Player>('test-validation', 'player5', {
        defaultValue: { name: 'David', health: 100, level: 1 },
        schema: PlayerSchema,
      });

      // This should not throw even though health is invalid
      await service.set(
        'test-validation',
        'player5',
        { name: 'David', health: 999, level: 1 },
        undefined,
        false // Skip validation
      );

      const value = await service.get<any>('test-validation', 'player5');
      expect(value.health).toBe(999);
    });

    it('should use default value if database value fails validation', async () => {
      // Register with valid value
      await service.register<Player>('test-validation', 'player6', {
        defaultValue: { name: 'Eve', health: 100, level: 1 },
      });

      // Manually corrupt the database value
      await prisma.replicant.update({
        where: { namespace_name: { namespace: 'test-validation', name: 'player6' } },
        data: { value: JSON.stringify({ name: '', health: 999, level: -5 }) },
      });

      // Create new service and register with schema
      const newService = new ReplicantService(prisma, undefined, logger, eventBus);
      await newService.initialize();

      const value = await newService.register<Player>('test-validation', 'player6', {
        defaultValue: { name: 'Eve', health: 100, level: 1 },
        schema: PlayerSchema,
      });

      // Should use default value since database value is invalid
      expect(value).toEqual({ name: 'Eve', health: 100, level: 1 });

      await newService.shutdown();
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to replicant changes', async () => {
      await service.register<number>('test', 'subscribed', { defaultValue: 0 });

      const changes: ReplicantChangeEvent<number>[] = [];
      service.subscribe('test', 'subscribed', (event) => {
        changes.push(event);
      });

      await service.set('test', 'subscribed', 10);
      await service.set('test', 'subscribed', 20);

      expect(changes).toHaveLength(2);
      expect(changes[0].newValue).toBe(10);
      expect(changes[1].newValue).toBe(20);
    });

    it('should unsubscribe from replicant changes', async () => {
      await service.register<number>('test', 'unsubscribed', { defaultValue: 0 });

      const changes: number[] = [];
      const unsubscribe = service.subscribe('test', 'unsubscribed', (event) => {
        changes.push(event.newValue);
      });

      await service.set('test', 'unsubscribed', 10);

      unsubscribe();

      await service.set('test', 'unsubscribed', 20);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe(10);
    });

    it('should handle multiple subscribers', async () => {
      await service.register<string>('test', 'multi-sub', { defaultValue: 'initial' });

      const changes1: string[] = [];
      const changes2: string[] = [];

      service.subscribe('test', 'multi-sub', (event) => changes1.push(event.newValue));
      service.subscribe('test', 'multi-sub', (event) => changes2.push(event.newValue));

      await service.set('test', 'multi-sub', 'updated');

      expect(changes1).toEqual(['updated']);
      expect(changes2).toEqual(['updated']);
    });

    it('should not throw if subscriber callback throws', async () => {
      await service.register<number>('test', 'error-sub', { defaultValue: 0 });

      service.subscribe('test', 'error-sub', () => {
        throw new Error('Subscriber error');
      });

      // Should not throw
      await expect(service.set('test', 'error-sub', 100)).resolves.toBe(true);
    });
  });

  describe('History', () => {
    it('should get replicant history', async () => {
      await service.register<string>('test-history', 'changelog', { defaultValue: 'v1' });
      await service.set('test-history', 'changelog', 'v2', 'user1');
      await service.set('test-history', 'changelog', 'v3', 'user2');

      const history = await service.getHistory('test-history', 'changelog', 10);

      expect(history).toHaveLength(3);
      expect(history[0].value).toBe('v3');
      expect(history[0].changedBy).toBe('user2');
      expect(history[1].value).toBe('v2');
      expect(history[1].changedBy).toBe('user1');
      expect(history[2].value).toBe('v1');
    });

    it('should limit history entries', async () => {
      await service.register<number>('test-history', 'limited', { defaultValue: 0 });

      for (let i = 1; i <= 10; i++) {
        await service.set('test-history', 'limited', i);
      }

      const history = await service.getHistory('test-history', 'limited', 5);

      expect(history).toHaveLength(5);
      expect(history[0].value).toBe(10); // Most recent
      expect(history[4].value).toBe(6);
    });

    it('should return empty history for non-existent replicant', async () => {
      const history = await service.getHistory('test-history', 'nonexistent', 10);
      expect(history).toHaveLength(0);
    });

    it('should include revision numbers in history', async () => {
      await service.register<number>('test-history', 'revisioned', { defaultValue: 1 });
      await service.set('test-history', 'revisioned', 2);
      await service.set('test-history', 'revisioned', 3);

      const history = await service.getHistory('test-history', 'revisioned', 10);

      expect(history[0].revision).toBeGreaterThan(history[1].revision);
      expect(history[1].revision).toBeGreaterThan(history[2].revision);
    });
  });

  describe('Namespace Queries', () => {
    it('should get all replicants in a namespace', async () => {
      await service.register('test', 'rep1', { defaultValue: 'a' });
      await service.register('test', 'rep2', { defaultValue: 'b' });
      await service.register('test', 'rep3', { defaultValue: 'c' });
      await service.register('other', 'rep1', { defaultValue: 'd' });

      const replicants = await service.getByNamespace('test');

      expect(replicants).toHaveLength(3);
      expect(replicants.map((r) => r.name).sort()).toEqual(['rep1', 'rep2', 'rep3']);
    });

    it('should return empty array for namespace with no replicants', async () => {
      const replicants = await service.getByNamespace('empty-namespace');
      expect(replicants).toHaveLength(0);
    });

    it('should get all replicants across all namespaces', async () => {
      await service.register('ns1', 'rep1', { defaultValue: 1 });
      await service.register('ns2', 'rep2', { defaultValue: 2 });
      await service.register('ns3', 'rep3', { defaultValue: 3 });

      const allReplicants = await service.getAll();

      const testReplicants = allReplicants.filter((r) =>
        ['ns1', 'ns2', 'ns3'].includes(r.namespace)
      );

      expect(testReplicants).toHaveLength(3);
    });

    it('should include metadata in namespace queries', async () => {
      const schema = z.string();
      await service.register('test', 'with-schema', { defaultValue: 'test', schema });

      const replicants = await service.getByNamespace('test');
      const withSchema = replicants.find((r) => r.name === 'with-schema');

      expect(withSchema).toBeDefined();
      expect(withSchema!.hasSchema).toBe(true);
      expect(withSchema!.namespace).toBe('test');
      expect(withSchema!.revision).toBeGreaterThanOrEqual(0);
      expect(withSchema!.createdAt).toBeInstanceOf(Date);
      expect(withSchema!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Deletion', () => {
    it('should delete a replicant', async () => {
      await service.register<string>('test', 'to-delete', { defaultValue: 'bye' });
      await service.delete('test', 'to-delete');

      const value = await service.get('test', 'to-delete');
      expect(value).toBeNull();
    });

    it('should emit deletion event', async () => {
      await service.register<number>('test', 'delete-event', { defaultValue: 0 });

      const eventPromise = new Promise<{ namespace: string; name: string }>((resolve) => {
        eventBus.once('replicant:deleted', (...args: unknown[]) => {
          resolve(args[0] as { namespace: string; name: string });
        });
      });

      await service.delete('test', 'delete-event');

      const event = await eventPromise;
      expect(event.namespace).toBe('test');
      expect(event.name).toBe('delete-event');
    });

    it('should delete from database', async () => {
      await service.register<string>('test', 'db-delete', { defaultValue: 'test' });
      await service.delete('test', 'db-delete');

      const dbReplicant = await prisma.replicant.findUnique({
        where: { namespace_name: { namespace: 'test', name: 'db-delete' } },
      });

      expect(dbReplicant).toBeNull();
    });

    it('should clean up subscriptions on delete', async () => {
      await service.register<number>('test', 'sub-delete', { defaultValue: 0 });

      const changes: number[] = [];
      service.subscribe('test', 'sub-delete', (event) => changes.push(event.newValue));

      await service.delete('test', 'sub-delete');

      // Re-register
      await service.register<number>('test', 'sub-delete', { defaultValue: 100 });

      // Old subscription should not fire
      await service.set('test', 'sub-delete', 200);

      expect(changes).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      await service.register<null>('test', 'null-value', { defaultValue: null });
      const value = await service.get('test', 'null-value');
      expect(value).toBeNull();
    });

    it('should handle undefined in objects', async () => {
      const obj = { defined: 'yes', undefined: undefined };
      await service.register('test', 'with-undefined', { defaultValue: obj });

      // undefined gets removed during JSON serialization
      const value = await service.get<any>('test', 'with-undefined');
      expect(value.defined).toBe('yes');
      expect(value.undefined).toBeUndefined();
    });

    it('should handle empty arrays', async () => {
      await service.register<any[]>('test', 'empty-array', { defaultValue: [] });
      const value = await service.get('test', 'empty-array');
      expect(value).toEqual([]);
    });

    it('should handle deeply nested objects', async () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      await service.register('test', 'deeply-nested', { defaultValue: nested });
      const value = await service.get<any>('test', 'deeply-nested');
      expect(value.level1.level2.level3.level4.value).toBe('deep');
    });

    it('should handle special characters in namespace and name', async () => {
      await service.register('test-ns_123', 'rep-name_456', { defaultValue: 'special' });
      const value = await service.get('test-ns_123', 'rep-name_456');
      expect(value).toBe('special');
    });
  });
});
