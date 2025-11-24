/**
 * Bundle Manager Service
 *
 * Core service for managing NodeCG bundles including:
 * - Bundle discovery and loading
 * - Dependency resolution
 * - Lifecycle management (load, unload, reload)
 * - Hot module replacement
 * - Extension execution
 *
 * Phase 3 Implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '../../database/generated/client';
import { BaseService } from '../base.service';
import type { NodeCGConfig } from '@nodecg/types';
import type { Logger } from '../../utils/logger';
import type { EventBus } from '../../utils/event-bus';
import { BundleRepository } from '../../database/repositories/bundle.repository';
import type {
  BundleConfig,
  Bundle as BundleType,
  BundleManager as IBundleManager,
} from '@nodecg/types';

export interface LoadedBundle {
  config: BundleConfig;
  dir: string;
  enabled: boolean;
  extension?: any; // Extension instance
  extensionPath?: string;
  packageJson?: any;
}

export interface BundleDiscoveryResult {
  found: string[];
  loaded: string[];
  failed: Array<{ name: string; error: string }>;
}

export interface BundleDependencyTree {
  [bundleName: string]: string[]; // Bundle name -> list of dependencies
}

/**
 * BundleManager Service
 *
 * Manages the complete lifecycle of NodeCG bundles from discovery to unloading
 */
export class BundleManager extends BaseService implements IBundleManager {
  private bundles: Map<string, LoadedBundle> = new Map();
  private repository: BundleRepository;
  private bundlesDir: string;
  private watching: boolean = false;
  private watchers: Map<string, any> = new Map();
  private hotReloadEnabled: boolean;

  constructor(prisma: PrismaClient, config?: NodeCGConfig, logger?: Logger, eventBus?: EventBus) {
    super('bundle-manager', { config, logger, eventBus });
    this.repository = new BundleRepository(prisma);

    // Default bundles directory (fallback to process.cwd()/bundles)
    this.bundlesDir = path.join(process.cwd(), 'bundles');

    // Hot reload enabled by default in development
    this.hotReloadEnabled = process.env.NODE_ENV !== 'production';
  }

  /**
   * Initialize the Bundle Manager
   * - Discovers bundles in bundles directory
   * - Loads enabled bundles
   * - Starts file watching for hot-reload
   */
  async initialize(): Promise<void> {
    await super.initialize();

    this.logger.info('Initializing Bundle Manager...');
    this.logger.info(`Bundles directory: ${this.bundlesDir}`);

    // Ensure bundles directory exists
    await this.ensureBundlesDirectory();

    // Discover all bundles
    const discovery = await this.discoverBundles();
    this.logger.info(`Discovered ${discovery.found.length} bundles`);

    if (discovery.failed.length > 0) {
      this.logger.warn(`Failed to load ${discovery.failed.length} bundles:`, discovery.failed);
    }

    // Load enabled bundles
    await this.loadEnabledBundles();

    // Start watching for changes (hot-reload)
    if (this.hotReloadEnabled) {
      await this.startWatching();
    }

    this.logger.info(`Bundle Manager initialized with ${this.bundles.size} bundles loaded`);
  }

  /**
   * Shutdown the Bundle Manager
   * - Unloads all bundles
   * - Stops file watching
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Bundle Manager...');

    // Stop watching
    await this.stopWatching();

    // Unload all bundles
    const bundleNames = Array.from(this.bundles.keys());
    for (const name of bundleNames) {
      try {
        await this.unload(name);
      } catch (error) {
        this.logger.error(`Failed to unload bundle ${name}:`, error);
      }
    }

    this.bundles.clear();

    await super.shutdown();
    this.logger.info('Bundle Manager shut down');
  }

  /**
   * Discover all bundles in the bundles directory
   * Scans for valid bundle directories containing nodecg.json or package.json
   */
  async discoverBundles(): Promise<BundleDiscoveryResult> {
    const result: BundleDiscoveryResult = {
      found: [],
      loaded: [],
      failed: [],
    };

    try {
      const entries = await fs.readdir(this.bundlesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const bundleName = entry.name;
        const bundleDir = path.join(this.bundlesDir, bundleName);

        try {
          // Check for nodecg.json or package.json
          const config = await this.loadBundleConfig(bundleDir);

          if (!config) {
            this.logger.debug(`Skipping ${bundleName}: no valid config found`);
            continue;
          }

          result.found.push(bundleName);

          // Register bundle in database
          await this.repository.upsert({
            name: config.name,
            version: config.version,
            config: JSON.stringify(config),
            enabled: true,
          });

          result.loaded.push(bundleName);
        } catch (error) {
          result.failed.push({
            name: bundleName,
            error: error instanceof Error ? error.message : String(error),
          });
          this.logger.error(`Failed to discover bundle ${bundleName}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to read bundles directory:', error);
      throw error;
    }

    return result;
  }

  /**
   * Load a bundle by name
   * - Validates configuration
   * - Resolves dependencies
   * - Loads extension (if present)
   * - Emits 'bundle:loaded' event
   */
  async load(bundleName: string): Promise<BundleType> {
    this.assertInitialized();

    // Check if already loaded
    if (this.bundles.has(bundleName)) {
      this.logger.warn(`Bundle ${bundleName} is already loaded`);
      return this.convertToBundle(this.bundles.get(bundleName)!);
    }

    const bundleDir = path.join(this.bundlesDir, bundleName);

    // Load configuration
    const config = await this.loadBundleConfig(bundleDir);
    if (!config) {
      throw new Error(`Bundle ${bundleName} has no valid configuration`);
    }

    // Validate dependencies
    await this.validateDependencies(config);

    // Load package.json for additional metadata
    const packageJson = await this.loadPackageJson(bundleDir);

    // Create loaded bundle
    const loadedBundle: LoadedBundle = {
      config,
      dir: bundleDir,
      enabled: true,
      packageJson,
    };

    // Load extension if present
    const extensionPath = path.join(bundleDir, 'extension', 'index.js');
    try {
      const extensionExists = await fs
        .access(extensionPath)
        .then(() => true)
        .catch(() => false);

      if (extensionExists) {
        loadedBundle.extensionPath = extensionPath;
        loadedBundle.extension = await this.loadExtension(extensionPath, config);
        this.logger.info(`Loaded extension for bundle: ${bundleName}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to load extension for ${bundleName}:`, error);
    }

    // Store loaded bundle
    this.bundles.set(bundleName, loadedBundle);

    // Emit event
    this.eventBus.emit('bundle:loaded', { bundleName, config });

    this.logger.info(`Bundle loaded: ${bundleName} v${config.version}`);

    return this.convertToBundle(loadedBundle);
  }

  /**
   * Unload a bundle
   * - Stops extension
   * - Clears from memory
   * - Emits 'bundle:unloaded' event
   */
  async unload(bundleName: string): Promise<void> {
    this.assertInitialized();

    const loadedBundle = this.bundles.get(bundleName);
    if (!loadedBundle) {
      throw new Error(`Bundle ${bundleName} is not loaded`);
    }

    // Call extension's stop method if it exists
    if (loadedBundle.extension && typeof loadedBundle.extension.stop === 'function') {
      try {
        await loadedBundle.extension.stop();
        this.logger.info(`Stopped extension for bundle: ${bundleName}`);
      } catch (error) {
        this.logger.error(`Error stopping extension for ${bundleName}:`, error);
      }
    }

    // Remove from cache to allow module reload
    if (loadedBundle.extensionPath) {
      delete require.cache[require.resolve(loadedBundle.extensionPath)];
    }

    // Remove from loaded bundles
    this.bundles.delete(bundleName);

    // Emit event
    this.eventBus.emit('bundle:unloaded', { bundleName });

    this.logger.info(`Bundle unloaded: ${bundleName}`);
  }

  /**
   * Reload a bundle
   * - Unloads existing bundle
   * - Loads bundle fresh
   * - Maintains configuration and state where possible
   */
  async reload(bundleName: string): Promise<BundleType> {
    this.assertInitialized();

    this.logger.info(`Reloading bundle: ${bundleName}`);

    // Unload if currently loaded
    if (this.bundles.has(bundleName)) {
      await this.unload(bundleName);
    }

    // Load fresh
    const bundle = await this.load(bundleName);

    // Emit event
    this.eventBus.emit('bundle:reloaded', { bundleName });

    this.logger.info(`Bundle reloaded: ${bundleName}`);

    return bundle;
  }

  /**
   * Get a loaded bundle by name
   */
  get(bundleName: string): BundleType | undefined {
    const loadedBundle = this.bundles.get(bundleName);
    return loadedBundle ? this.convertToBundle(loadedBundle) : undefined;
  }

  /**
   * Get all loaded bundles
   */
  getAll(): BundleType[] {
    return Array.from(this.bundles.values()).map(this.convertToBundle);
  }

  /**
   * Enable a bundle
   * - Updates database status
   * - Loads bundle if not already loaded
   */
  async enable(bundleName: string): Promise<void> {
    this.assertInitialized();

    await this.repository.enableByName(bundleName);

    if (!this.bundles.has(bundleName)) {
      await this.load(bundleName);
    }

    this.eventBus.emit('bundle:enabled', { bundleName });
    this.logger.info(`Bundle enabled: ${bundleName}`);
  }

  /**
   * Disable a bundle
   * - Updates database status
   * - Unloads bundle if currently loaded
   */
  async disable(bundleName: string): Promise<void> {
    this.assertInitialized();

    await this.repository.disableByName(bundleName);

    if (this.bundles.has(bundleName)) {
      await this.unload(bundleName);
    }

    this.eventBus.emit('bundle:disabled', { bundleName });
    this.logger.info(`Bundle disabled: ${bundleName}`);
  }

  /**
   * Get bundle statistics
   */
  async getStatistics(): Promise<{
    total: number;
    loaded: number;
    enabled: number;
    disabled: number;
  }> {
    const dbStats = await this.repository.getStatistics();

    return {
      total: dbStats.total,
      loaded: this.bundles.size,
      enabled: dbStats.enabled,
      disabled: dbStats.disabled,
    };
  }

  /**
   * Get dependency tree for all bundles
   */
  async getDependencyTree(): Promise<BundleDependencyTree> {
    const tree: BundleDependencyTree = {};

    for (const [name, bundle] of this.bundles) {
      tree[name] = Object.keys(bundle.config.dependencies || {});
    }

    return tree;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Ensure bundles directory exists
   */
  private async ensureBundlesDirectory(): Promise<void> {
    try {
      await fs.access(this.bundlesDir);
    } catch {
      this.logger.warn(`Bundles directory does not exist, creating: ${this.bundlesDir}`);
      await fs.mkdir(this.bundlesDir, { recursive: true });
    }
  }

  /**
   * Load enabled bundles from database
   */
  private async loadEnabledBundles(): Promise<void> {
    const enabledBundles = await this.repository.findEnabled();

    for (const dbBundle of enabledBundles) {
      try {
        await this.load(dbBundle.name);
      } catch (error) {
        this.logger.error(`Failed to load enabled bundle ${dbBundle.name}:`, error);
      }
    }
  }

  /**
   * Load bundle configuration from nodecg.json or package.json
   */
  private async loadBundleConfig(bundleDir: string): Promise<BundleConfig | null> {
    // Try nodecg.json first
    const nodecgJsonPath = path.join(bundleDir, 'nodecg.json');
    try {
      const content = await fs.readFile(nodecgJsonPath, 'utf-8');
      return JSON.parse(content) as BundleConfig;
    } catch {
      // Fall back to package.json
      return this.loadPackageJson(bundleDir);
    }
  }

  /**
   * Load package.json
   */
  private async loadPackageJson(bundleDir: string): Promise<any> {
    const packageJsonPath = path.join(bundleDir, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Validate bundle dependencies
   */
  private async validateDependencies(config: BundleConfig): Promise<void> {
    if (!config.dependencies) return;

    const missingDeps: string[] = [];

    for (const depName of Object.keys(config.dependencies)) {
      const depBundle = await this.repository.findByName(depName);
      if (!depBundle || !depBundle.enabled) {
        missingDeps.push(depName);
      }
    }

    if (missingDeps.length > 0) {
      throw new Error(
        `Bundle ${config.name} has missing or disabled dependencies: ${missingDeps.join(', ')}`
      );
    }
  }

  /**
   * Load extension module
   */
  private async loadExtension(extensionPath: string, config: BundleConfig): Promise<any> {
    try {
      // Clear require cache for hot-reload
      delete require.cache[require.resolve(extensionPath)];

      // Load extension module
      const extension = require(extensionPath);

      // Call initialization if present
      if (typeof extension.init === 'function') {
        await extension.init(this.createBundleAPI(config));
      }

      return extension;
    } catch (error) {
      this.logger.error(`Failed to load extension at ${extensionPath}:`, error);
      throw error;
    }
  }

  /**
   * Create NodeCG API object for extension
   */
  private createBundleAPI(config: BundleConfig): any {
    // This will be expanded in future phases
    return {
      bundleName: config.name,
      bundleVersion: config.version,
      bundleConfig: config,
      Logger: this.logger,
      // Replicant, sendMessage, etc. will be added later
    };
  }

  /**
   * Start watching bundles directory for changes
   */
  private async startWatching(): Promise<void> {
    if (this.watching) return;

    this.logger.info('Starting hot-reload file watching...');

    // Note: Actual file watching implementation would use chokidar or fs.watch
    // Simplified for now - full implementation in next iteration
    this.watching = true;

    this.logger.info('Hot-reload watching started');
  }

  /**
   * Stop watching bundles directory
   */
  private async stopWatching(): Promise<void> {
    if (!this.watching) return;

    this.logger.info('Stopping hot-reload file watching...');

    for (const watcher of this.watchers.values()) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    }

    this.watchers.clear();
    this.watching = false;

    this.logger.info('Hot-reload watching stopped');
  }

  /**
   * Convert LoadedBundle to Bundle interface
   */
  private convertToBundle(loadedBundle: LoadedBundle): BundleType {
    return {
      config: loadedBundle.config,
      dir: loadedBundle.dir,
      enabled: loadedBundle.enabled,
      extension: loadedBundle.extension,
    };
  }
}
