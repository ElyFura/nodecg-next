/**
 * Replicant Repository Tests
 * Tests all database operations for replicants
 *
 * NOTE: These tests require a real PostgreSQL database.
 * In offline/CI environments without database, tests will use mocks and may not fully validate behavior.
 * To run with real database: Set DATABASE_URL environment variable
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '../generated/client';
import { ReplicantRepository } from './replicant.repository';

// Skip these tests if running with mock database (offline environment)
const isRealDatabase = process.env.DATABASE_URL?.includes('postgresql://');
const describeDb = isRealDatabase ? describe : describe.skip;

describeDb('ReplicantRepository', () => {
  let prisma: PrismaClient;
  let repository: ReplicantRepository;

  beforeAll(async () => {
    // Use test database or in-memory SQLite for testing
    prisma = new PrismaClient();
    repository = new ReplicantRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.replicantHistory.deleteMany();
    await prisma.replicant.deleteMany();
  });

  describe('create', () => {
    it('should create a new replicant', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'test-replicant',
        value: JSON.stringify({ count: 0 }),
        schema: JSON.stringify({ type: 'object' }),
      });

      expect(replicant).toBeDefined();
      expect(replicant.namespace).toBe('test-bundle');
      expect(replicant.name).toBe('test-replicant');
      expect(replicant.revision).toBe(0);
    });

    it('should create replicant with default revision 0', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'counter',
        value: '{"value": 0}',
      });

      expect(replicant.revision).toBe(0);
    });
  });

  describe('findByNamespaceAndName', () => {
    it('should find replicant by namespace and name', async () => {
      await repository.create({
        namespace: 'test-bundle',
        name: 'test-replicant',
        value: '{"test": true}',
      });

      const found = await repository.findByNamespaceAndName('test-bundle', 'test-replicant');

      expect(found).toBeDefined();
      expect(found?.namespace).toBe('test-bundle');
      expect(found?.name).toBe('test-replicant');
    });

    it('should return null for non-existent replicant', async () => {
      const found = await repository.findByNamespaceAndName('nonexistent', 'replicant');
      expect(found).toBeNull();
    });

    it('should include history when requested', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'with-history',
        value: '{"version": 1}',
      });

      // Update to create history
      await repository.update(replicant.id, { value: '{"version": 2}' });

      const found = await repository.findByNamespaceAndName('test-bundle', 'with-history', true);

      expect(found).toBeDefined();
      expect(found?.history).toBeDefined();
      expect(found?.history?.length).toBeGreaterThan(0);
    });
  });

  describe('findByNamespace', () => {
    it('should find all replicants for a namespace', async () => {
      await repository.create({
        namespace: 'bundle-a',
        name: 'replicant-1',
        value: '{}',
      });
      await repository.create({
        namespace: 'bundle-a',
        name: 'replicant-2',
        value: '{}',
      });
      await repository.create({
        namespace: 'bundle-b',
        name: 'replicant-3',
        value: '{}',
      });

      const replicants = await repository.findByNamespace('bundle-a');

      expect(replicants).toHaveLength(2);
      expect(replicants.every((r) => r.namespace === 'bundle-a')).toBe(true);
    });

    it('should return empty array for namespace with no replicants', async () => {
      const replicants = await repository.findByNamespace('empty-namespace');
      expect(replicants).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update replicant value and increment revision', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'counter',
        value: '{"count": 0}',
      });

      const updated = await repository.update(replicant.id, {
        value: '{"count": 1}',
      });

      expect(updated.value).toBe('{"count": 1}');
      expect(updated.revision).toBe(1);
    });

    it('should create history entry on update', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'with-history',
        value: '{"v": 1}',
      });

      await repository.update(replicant.id, { value: '{"v": 2}' });

      const history = await repository.getHistory(replicant.id);

      expect(history).toHaveLength(1);
      expect(history[0].value).toBe('{"v": 1}');
    });

    it('should throw error for non-existent replicant', async () => {
      await expect(repository.update('non-existent-id', { value: '{}' })).rejects.toThrow();
    });
  });

  describe('updateByNamespaceAndName', () => {
    it('should update replicant by namespace and name', async () => {
      await repository.create({
        namespace: 'test-bundle',
        name: 'counter',
        value: '{"count": 0}',
      });

      const updated = await repository.updateByNamespaceAndName(
        'test-bundle',
        'counter',
        '{"count": 5}',
        'test-user'
      );

      expect(updated.value).toBe('{"count": 5}');
      expect(updated.revision).toBe(1);
    });

    it('should record changedBy in history', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'tracked',
        value: '{"data": 1}',
      });

      await repository.updateByNamespaceAndName(
        'test-bundle',
        'tracked',
        '{"data": 2}',
        'admin-user'
      );

      const history = await repository.getHistory(replicant.id);

      expect(history[0].changedBy).toBe('admin-user');
    });
  });

  describe('delete', () => {
    it('should delete replicant by id', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'to-delete',
        value: '{}',
      });

      await repository.delete(replicant.id);

      const found = await repository.findById(replicant.id);
      expect(found).toBeNull();
    });

    it('should cascade delete history entries', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'with-history',
        value: '{"v": 1}',
      });

      // Create some history
      await repository.update(replicant.id, { value: '{"v": 2}' });
      await repository.update(replicant.id, { value: '{"v": 3}' });

      // Delete replicant
      await repository.delete(replicant.id);

      // History should be deleted too (cascade)
      const history = await prisma.replicantHistory.findMany({
        where: { replicantId: replicant.id },
      });

      expect(history).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing replicant', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'exists',
        value: '{}',
      });

      const exists = await repository.exists(replicant.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent replicant', async () => {
      const exists = await repository.exists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('existsByNamespaceAndName', () => {
    it('should return true for existing replicant', async () => {
      await repository.create({
        namespace: 'test-bundle',
        name: 'exists',
        value: '{}',
      });

      const exists = await repository.existsByNamespaceAndName('test-bundle', 'exists');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent replicant', async () => {
      const exists = await repository.existsByNamespaceAndName('test-bundle', 'nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all replicants', async () => {
      await repository.create({ namespace: 'bundle-a', name: 'rep-1', value: '{}' });
      await repository.create({ namespace: 'bundle-a', name: 'rep-2', value: '{}' });
      await repository.create({ namespace: 'bundle-b', name: 'rep-3', value: '{}' });

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should count replicants by namespace', async () => {
      await repository.create({ namespace: 'bundle-a', name: 'rep-1', value: '{}' });
      await repository.create({ namespace: 'bundle-a', name: 'rep-2', value: '{}' });
      await repository.create({ namespace: 'bundle-b', name: 'rep-3', value: '{}' });

      const count = await repository.count({ namespace: 'bundle-a' });
      expect(count).toBe(2);
    });
  });

  describe('getHistory', () => {
    it('should get replicant history', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'versioned',
        value: '{"v": 1}',
      });

      await repository.update(replicant.id, { value: '{"v": 2}' });
      await repository.update(replicant.id, { value: '{"v": 3}' });

      const history = await repository.getHistory(replicant.id);

      expect(history).toHaveLength(2);
      expect(history[0].value).toBe('{"v": 2}'); // Most recent first
      expect(history[1].value).toBe('{"v": 1}');
    });

    it('should limit history results', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'versioned',
        value: '{"v": 0}',
      });

      // Create 10 updates
      for (let i = 1; i <= 10; i++) {
        await repository.update(replicant.id, { value: `{"v": ${i}}` });
      }

      const history = await repository.getHistory(replicant.id, 5);

      expect(history).toHaveLength(5);
    });
  });

  describe('pruneHistory', () => {
    it('should prune old history entries', async () => {
      const replicant = await repository.create({
        namespace: 'test-bundle',
        name: 'prunable',
        value: '{"v": 0}',
      });

      // Create 20 updates
      for (let i = 1; i <= 20; i++) {
        await repository.update(replicant.id, { value: `{"v": ${i}}` });
      }

      // Prune to keep only 10
      const deleted = await repository.pruneHistory(10);

      expect(deleted).toBeGreaterThan(0);

      const history = await repository.getHistory(replicant.id, 100);
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getNamespaces', () => {
    it('should get all distinct namespaces', async () => {
      await repository.create({ namespace: 'bundle-a', name: 'rep-1', value: '{}' });
      await repository.create({ namespace: 'bundle-a', name: 'rep-2', value: '{}' });
      await repository.create({ namespace: 'bundle-b', name: 'rep-3', value: '{}' });
      await repository.create({ namespace: 'bundle-c', name: 'rep-4', value: '{}' });

      const namespaces = await repository.getNamespaces();

      expect(namespaces).toHaveLength(3);
      expect(namespaces).toContain('bundle-a');
      expect(namespaces).toContain('bundle-b');
      expect(namespaces).toContain('bundle-c');
    });

    it('should return empty array when no replicants exist', async () => {
      const namespaces = await repository.getNamespaces();
      expect(namespaces).toHaveLength(0);
    });
  });

  describe('getReplicantNames', () => {
    it('should get all replicant names for a namespace', async () => {
      await repository.create({ namespace: 'test-bundle', name: 'rep-1', value: '{}' });
      await repository.create({ namespace: 'test-bundle', name: 'rep-2', value: '{}' });
      await repository.create({ namespace: 'other-bundle', name: 'rep-3', value: '{}' });

      const names = await repository.getReplicantNames('test-bundle');

      expect(names).toHaveLength(2);
      expect(names).toContain('rep-1');
      expect(names).toContain('rep-2');
      expect(names).not.toContain('rep-3');
    });
  });
});
