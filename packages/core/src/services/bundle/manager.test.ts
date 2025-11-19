/**
 * Bundle Manager Tests
 * Comprehensive test suite for Bundle Manager service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BundleManager } from './manager';
import { createLogger } from '../../utils/logger';
import { getRepositories } from '../../database/client';

// Mock the database client
vi.mock('../../database/client', () => ({
  getRepositories: vi.fn(() => ({
    bundle: {
      findByName: vi.fn(),
      findEnabled: vi.fn(),
      upsert: vi.fn(),
      enableByName: vi.fn(),
      disableByName: vi.fn(),
    },
  })),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
  watch: vi.fn(() => ({
    [Symbol.asyncIterator]: async function* () {
      // Mock watcher that never emits
      yield* [];
    },
  })),
}));

describe('BundleManager', () => {
  let bundleManager: BundleManager;
  let mockRepository: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    mockRepository = getRepositories(createLogger({ level: 'silent' })).bundle;

    bundleManager = new BundleManager({
      bundlesDir: '/test/bundles',
      enableHotReload: false,
      logger: createLogger({ level: 'silent' }),
    });
  });

  afterEach(async () => {
    if (bundleManager && bundleManager.isInitialized()) {
      await bundleManager.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockRepository.findEnabled.mockResolvedValue([]);

      await bundleManager.initialize();

      expect(bundleManager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockRepository.findEnabled.mockResolvedValue([]);

      await bundleManager.initialize();
      await bundleManager.initialize(); // Should warn but not throw

      expect(bundleManager.isInitialized()).toBe(true);
    });

    it('should load enabled bundles on initialization', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findEnabled.mockResolvedValue([mockBundle]);
      mockRepository.findByName.mockResolvedValue(mockBundle);

      // Mock stat to make extension check fail (optional extension)
      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.initialize();

      expect(bundleManager.isInitialized()).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      mockRepository.findEnabled.mockResolvedValue([]);

      await bundleManager.initialize();
      await bundleManager.shutdown();

      expect(bundleManager.isInitialized()).toBe(false);
    });

    it('should not shutdown if not initialized', async () => {
      await bundleManager.shutdown(); // Should warn but not throw
      expect(bundleManager.isInitialized()).toBe(false);
    });
  });

  describe('bundle discovery', () => {
    it('should discover bundles in directory', async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();

      const { readdir, readFile, stat } = await import('fs/promises');

      (readdir as any).mockResolvedValue([
        { name: 'bundle1', isDirectory: () => true },
        { name: 'bundle2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ]);

      (stat as any).mockResolvedValue({ isFile: () => true });

      (readFile as any).mockResolvedValue(
        JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        })
      );

      mockRepository.upsert.mockResolvedValue({
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: '{}',
        enabled: true,
      });

      const discovered = await bundleManager.discoverBundles();

      expect(Array.isArray(discovered)).toBe(true);
    });

    it('should handle missing bundles directory', async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();

      const { readdir } = await import('fs/promises');
      (readdir as any).mockRejectedValue({ code: 'ENOENT' });

      const discovered = await bundleManager.discoverBundles();

      expect(discovered).toEqual([]);
    });
  });

  describe('bundle loading', () => {
    beforeEach(async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();
    });

    it('should load a bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT')); // No extension

      const bundle = await bundleManager.load('test-bundle');

      expect(bundle).toBeDefined();
      expect(bundle.config.name).toBe('test-bundle');
      expect(bundleManager.isLoaded('test-bundle')).toBe(true);
    });

    it('should not load already loaded bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      const bundle2 = await bundleManager.load('test-bundle');

      expect(bundle2).toBeDefined();
      expect(mockRepository.findByName).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent bundle', async () => {
      mockRepository.findByName.mockResolvedValue(null);

      await expect(bundleManager.load('non-existent')).rejects.toThrow('not found');
    });

    it('should throw error for disabled bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'disabled-bundle',
        version: '1.0.0',
        config: '{}',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      await expect(bundleManager.load('disabled-bundle')).rejects.toThrow('disabled');
    });
  });

  describe('bundle unloading', () => {
    beforeEach(async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();
    });

    it('should unload a loaded bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      await bundleManager.unload('test-bundle');

      expect(bundleManager.isLoaded('test-bundle')).toBe(false);
    });

    it('should not throw when unloading non-loaded bundle', async () => {
      await bundleManager.unload('non-existent');
      // Should not throw
    });
  });

  describe('bundle reload', () => {
    beforeEach(async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();
    });

    it('should reload a bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      const reloaded = await bundleManager.reload('test-bundle');

      expect(reloaded).toBeDefined();
      expect(bundleManager.isLoaded('test-bundle')).toBe(true);
    });
  });

  describe('bundle enable/disable', () => {
    beforeEach(async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();
    });

    it('should enable a bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.enableByName.mockResolvedValue(mockBundle);
      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.enable('test-bundle');

      expect(mockRepository.enableByName).toHaveBeenCalledWith('test-bundle');
      expect(bundleManager.isLoaded('test-bundle')).toBe(true);
    });

    it('should disable a bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);
      mockRepository.disableByName.mockResolvedValue({ ...mockBundle, enabled: false });

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      await bundleManager.disable('test-bundle');

      expect(mockRepository.disableByName).toHaveBeenCalledWith('test-bundle');
      expect(bundleManager.isLoaded('test-bundle')).toBe(false);
    });
  });

  describe('bundle queries', () => {
    beforeEach(async () => {
      mockRepository.findEnabled.mockResolvedValue([]);
      await bundleManager.initialize();
    });

    it('should get a bundle', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      const bundle = bundleManager.get('test-bundle');

      expect(bundle).toBeDefined();
      expect(bundle?.config.name).toBe('test-bundle');
    });

    it('should return undefined for non-existent bundle', () => {
      const bundle = bundleManager.get('non-existent');
      expect(bundle).toBeUndefined();
    });

    it('should get all bundles', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      const bundles = bundleManager.getAll();

      expect(bundles).toHaveLength(1);
      expect(bundles[0].config.name).toBe('test-bundle');
    });

    it('should get bundle directory', async () => {
      const mockBundle = {
        id: '1',
        name: 'test-bundle',
        version: '1.0.0',
        config: JSON.stringify({
          name: 'test-bundle',
          version: '1.0.0',
          nodecg: { compatibleRange: '^3.0.0' },
        }),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByName.mockResolvedValue(mockBundle);

      const { stat } = await import('fs/promises');
      (stat as any).mockRejectedValue(new Error('ENOENT'));

      await bundleManager.load('test-bundle');
      const dir = bundleManager.getBundleDir('test-bundle');

      expect(dir).toContain('test-bundle');
    });

    it('should get statistics', async () => {
      const stats = bundleManager.getStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('loaded');
      expect(stats).toHaveProperty('bundles');
      expect(Array.isArray(stats.bundles)).toBe(true);
    });
  });

  describe('service lifecycle', () => {
    it('should throw error when calling methods before initialization', async () => {
      expect(() => bundleManager.get('test')).toThrow('not initialized');
    });

    it('should have correct service name', () => {
      expect(bundleManager.getServiceName()).toBe('BundleManager');
    });
  });
});
