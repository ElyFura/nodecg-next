/**
 * Bundle Manager Service
 * Handles bundle discovery, loading, lifecycle management, and hot reload
 */

import { readdir, readFile, stat, watch } from 'fs/promises';
import { join } from 'path';
import { BaseService, ServiceOptions } from '../base.service';
import { Bundle, BundleConfig, BundleManager as IBundleManager } from '@nodecg/types';
import { BundleRepository } from '../../database/repositories/bundle.repository';
import { getRepositories } from '../../database/client';
import { NodeCGError, ErrorCodes } from '../../utils/errors';
import type { ReplicantService } from '../replicant';
import { createNodeCGContext } from './extension-context';
import type { Server as SocketIOServer } from 'socket.io';

export interface BundleManagerOptions extends ServiceOptions {
  bundlesDir?: string;
  enableHotReload?: boolean;
}

export interface LoadedBundle extends Bundle {
  loadedAt: Date;
  dependencies: string[];
}

/**
 * Bundle Manager Service
 * Manages bundle lifecycle, discovery, and hot reloading
 */
export class BundleManager extends BaseService implements IBundleManager {
  private bundles: Map<string, LoadedBundle> = new Map();
  private bundlesDir: string;
  private enableHotReload: boolean;
  private repository: BundleRepository;
  // eslint-disable-next-line no-undef
  private watchers: Map<string, AbortController> = new Map();
  private replicantService: ReplicantService | null = null;
  private socketIO: SocketIOServer | null = null;

  constructor(options: BundleManagerOptions = {}) {
    super('BundleManager', options);

    // Find the project root (go up from packages/core to project root)
    // Check for both Unix (/) and Windows (\) path separators
    const cwd = process.cwd();
    const projectRoot =
      cwd.includes('/packages/') || cwd.includes('\\packages\\') ? join(cwd, '../..') : cwd;

    this.bundlesDir = options.bundlesDir || join(projectRoot, 'bundles');
    this.enableHotReload = options.enableHotReload ?? true;
    this.repository = getRepositories(this.logger).bundle;
  }

  /**
   * Set the replicant service
   * This is called after the service is created during server initialization
   */
  setReplicantService(replicantService: ReplicantService): void {
    this.replicantService = replicantService;
    this.logger.info('ReplicantService set on BundleManager');

    // Execute any extensions that were loaded before replicantService was available
    this.executeLoadedExtensions();
  }

  /**
   * Set the Socket.IO server
   * This is called after the WebSocket server is created during server initialization
   */
  setSocketIO(io: SocketIOServer): void {
    this.socketIO = io;
    this.logger.info('Socket.IO server set on BundleManager');

    // Re-execute extensions with Socket.IO support
    this.executeLoadedExtensions();
  }

  /**
   * Execute extensions for all loaded bundles
   * This is called when replicantService becomes available
   */
  private executeLoadedExtensions(): void {
    console.log(`[executeLoadedExtensions] Called! Bundle count: ${this.bundles.size}`);
    this.logger.info(`Executing loaded extensions for ${this.bundles.size} bundle(s)`);
    for (const [bundleName, bundle] of this.bundles) {
      console.log(
        `[executeLoadedExtensions] Bundle: ${bundleName}, has extension: ${!!bundle.extension}`
      );
      this.logger.debug(`Checking bundle: ${bundleName}, has extension: ${!!bundle.extension}`);
      if (bundle.extension) {
        console.log(`[executeLoadedExtensions] Calling executeExtension for ${bundleName}`);
        this.logger.info(`Executing extension for: ${bundleName}`);
        this.executeExtension(bundleName, bundle.extension);
      } else {
        console.log(`[executeLoadedExtensions] Bundle ${bundleName} has NO extension!`);
      }
    }
    console.log(`[executeLoadedExtensions] Done!`);
  }

  /**
   * Execute a bundle extension with NodeCG context
   */
  private executeExtension(bundleName: string, extension: unknown): void {
    this.logger.info(`executeExtension called for ${bundleName}`);
    this.logger.debug(`  - replicantService available: ${!!this.replicantService}`);
    this.logger.debug(`  - socketIO available: ${!!this.socketIO}`);
    this.logger.debug(`  - extension type: ${typeof extension}`);

    if (!this.replicantService) {
      this.logger.debug(
        `ReplicantService not available yet, deferring extension execution for ${bundleName}`
      );
      return;
    }

    try {
      // Create NodeCG context for the extension
      this.logger.info(`Creating NodeCG context for ${bundleName}...`);
      const nodecgContext = createNodeCGContext(
        bundleName,
        this.logger,
        this.replicantService,
        this.socketIO || undefined
      );

      // Execute the extension function
      // Handle both CommonJS (module.exports) and ES6 (export default) patterns
      const ext = extension as Record<string, unknown>;
      this.logger.debug(`Extension keys: ${JSON.stringify(Object.keys(ext))}`);

      if (typeof extension === 'function') {
        // Direct function export
        this.logger.info(`Calling extension function directly for ${bundleName}...`);
        extension(nodecgContext);
        this.logger.info(`✅ Executed extension for bundle: ${bundleName}`);
      } else if (ext.default && typeof ext.default === 'function') {
        // ES6 default export
        this.logger.info(`Calling extension default export for ${bundleName}...`);
        (ext.default as (ctx: unknown) => void)(nodecgContext);
        this.logger.info(`✅ Executed extension for bundle: ${bundleName}`);
      } else {
        this.logger.warn(`Extension for ${bundleName} does not export a function`);
        this.logger.debug(`Extension structure: ${JSON.stringify(Object.keys(ext))}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to execute extension for ${bundleName}:`);
      this.logger.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  /**
   * Initialize the bundle manager
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info(`Bundle directory: ${this.bundlesDir}`);
    this.logger.info(`Current working directory: ${process.cwd()}`);
    this.logger.info(`Hot reload: ${this.enableHotReload ? 'enabled' : 'disabled'}`);
    this.logger.debug(`Resolved bundle directory: ${this.bundlesDir}`);

    // Discover and load bundles
    const discovered = await this.discoverBundles();

    // Load all discovered bundles
    for (const bundleName of discovered) {
      try {
        await this.load(bundleName);
      } catch (error) {
        this.logger.error(`Failed to load bundle ${bundleName}:`, error);
      }
    }

    // Start hot reload watchers if enabled
    if (this.enableHotReload) {
      await this.startHotReload();
    }

    this.emitEvent('ready', this.bundles.size);
  }

  /**
   * Shutdown the bundle manager
   */
  protected async onShutdown(): Promise<void> {
    // Stop all watchers
    for (const [name, controller] of this.watchers) {
      controller.abort();
      this.logger.debug(`Stopped watching bundle: ${name}`);
    }
    this.watchers.clear();

    // Unload all bundles
    const bundleNames = Array.from(this.bundles.keys());
    for (const name of bundleNames) {
      await this.unload(name).catch((error) => {
        this.logger.error(`Failed to unload bundle ${name}:`, error);
      });
    }

    this.bundles.clear();
  }

  /**
   * Discover bundles in the bundles directory
   */
  async discoverBundles(): Promise<string[]> {
    try {
      const entries = await readdir(this.bundlesDir, { withFileTypes: true });
      const discovered: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const bundlePath = join(this.bundlesDir, entry.name);
        const packageJsonPath = join(bundlePath, 'package.json');

        try {
          // Check if package.json exists
          await stat(packageJsonPath);

          // Read and validate bundle config
          const config = await this.readBundleConfig(packageJsonPath);

          // Register bundle in database
          await this.repository.upsert({
            name: config.name,
            version: config.version,
            config: JSON.stringify(config),
            enabled: true,
          });

          discovered.push(config.name);
          this.logger.debug(`Discovered bundle: ${config.name}`);
        } catch (error) {
          this.logger.warn(`Failed to discover bundle in ${entry.name}:`, error);
        }
      }

      this.logger.info(`Discovered ${discovered.length} bundles`);
      this.emitEvent('discovery:complete', discovered);

      return discovered;
    } catch (error) {
      // eslint-disable-next-line no-undef
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`Bundles directory does not exist: ${this.bundlesDir}`);
        return [];
      }
      throw new NodeCGError(
        ErrorCodes.BUNDLE_DISCOVERY_FAILED,
        `Failed to discover bundles: ${error}`
      );
    }
  }

  /**
   * Read and parse bundle configuration
   */
  private async readBundleConfig(packageJsonPath: string): Promise<BundleConfig> {
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    if (!packageJson.name) {
      throw new NodeCGError(ErrorCodes.BUNDLE_INVALID_CONFIG, 'Bundle name is required');
    }

    if (!packageJson.version) {
      throw new NodeCGError(ErrorCodes.BUNDLE_INVALID_CONFIG, 'Bundle version is required');
    }

    if (!packageJson.nodecg) {
      throw new NodeCGError(ErrorCodes.BUNDLE_INVALID_CONFIG, 'NodeCG configuration is required');
    }

    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      homepage: packageJson.homepage,
      author: packageJson.author,
      license: packageJson.license,
      dependencies: packageJson.nodecgDependencies || packageJson.bundleDependencies || {},
      nodecg: packageJson.nodecg,
    };
  }

  /**
   * Load a bundle
   */
  async load(bundleName: string): Promise<Bundle> {
    // Check if already loaded
    if (this.bundles.has(bundleName)) {
      this.logger.warn(`Bundle ${bundleName} is already loaded`);
      return this.bundles.get(bundleName)!;
    }

    try {
      const bundleDir = join(this.bundlesDir, bundleName);

      // Try to get bundle config from database, fallback to filesystem
      let config: BundleConfig;
      try {
        const dbBundle = await this.repository.findByName(bundleName);
        if (dbBundle && !dbBundle.enabled) {
          throw new NodeCGError(ErrorCodes.BUNDLE_DISABLED, `Bundle ${bundleName} is disabled`);
        }
        if (dbBundle) {
          config = JSON.parse(dbBundle.config) as BundleConfig;
        } else {
          // Fallback: read directly from filesystem
          this.logger.debug(`Bundle ${bundleName} not in database, loading from filesystem`);
          config = await this.readBundleConfig(join(bundleDir, 'package.json'));
        }
      } catch (error) {
        // If database error, fallback to filesystem
        this.logger.debug(`Database error for ${bundleName}, loading from filesystem:`, error);
        config = await this.readBundleConfig(join(bundleDir, 'package.json'));
      }

      // Check dependencies
      const dependencies = await this.resolveDependencies(config);

      // Load dependencies first
      for (const dep of dependencies) {
        if (!this.bundles.has(dep)) {
          await this.load(dep);
        }
      }

      // Load extension if exists
      let extension: unknown = undefined;
      const extensionPath = join(bundleDir, 'extension', 'index.js');
      console.log(`[BundleManager] Checking for extension at: ${extensionPath}`);
      try {
        await stat(extensionPath);
        console.log(`[BundleManager] Extension file exists, importing...`);
        // Dynamic import for extension
        extension = await import(extensionPath);
        console.log(`[BundleManager] Extension imported successfully:`, typeof extension);
        this.logger.info(`✅ Loaded extension for bundle: ${bundleName}`);
      } catch (error) {
        // Extension is optional
        console.log(`[BundleManager] Extension not found or failed:`, error);
        this.logger.debug(`No extension found for bundle: ${bundleName}`);
      }
      console.log(`[BundleManager] Extension value:`, extension ? 'SET' : 'UNDEFINED');

      // Create loaded bundle
      const bundle: LoadedBundle = {
        config,
        dir: bundleDir,
        enabled: true,
        extension,
        loadedAt: new Date(),
        dependencies,
      };

      this.bundles.set(bundleName, bundle);
      this.logger.info(`Loaded bundle: ${bundleName} v${config.version}`);
      this.emitEvent('bundle:loaded', bundleName, bundle);

      // Execute extension if it exists and replicantService is available
      if (extension) {
        this.executeExtension(bundleName, extension);
      }

      return bundle;
    } catch (error) {
      this.logger.error(`Failed to load bundle ${bundleName}:`, error);
      throw error;
    }
  }

  /**
   * Unload a bundle
   */
  async unload(bundleName: string): Promise<void> {
    this.assertInitialized();

    const bundle = this.bundles.get(bundleName);
    if (!bundle) {
      this.logger.warn(`Bundle ${bundleName} is not loaded`);
      return;
    }

    try {
      // Check if other bundles depend on this
      const dependents = this.getDependents(bundleName);
      if (dependents.length > 0) {
        throw new NodeCGError(
          ErrorCodes.BUNDLE_HAS_DEPENDENTS,
          `Cannot unload ${bundleName}: ${dependents.join(', ')} depend on it`
        );
      }

      // Stop watching if hot reload is enabled
      const watcher = this.watchers.get(bundleName);
      if (watcher) {
        watcher.abort();
        this.watchers.delete(bundleName);
      }

      // Cleanup extension if exists
      if (bundle.extension) {
        // Call cleanup function if available
        const ext = bundle.extension as Record<string, unknown>;
        if (typeof ext.stop === 'function') {
          await (ext.stop as () => Promise<void>)();
        }
      }

      this.bundles.delete(bundleName);
      this.logger.info(`Unloaded bundle: ${bundleName}`);
      this.emitEvent('bundle:unloaded', bundleName);
    } catch (error) {
      this.logger.error(`Failed to unload bundle ${bundleName}:`, error);
      throw error;
    }
  }

  /**
   * Reload a bundle
   */
  async reload(bundleName: string): Promise<Bundle> {
    this.assertInitialized();

    this.logger.info(`Reloading bundle: ${bundleName}`);

    // Unload first
    await this.unload(bundleName);

    // Load again
    const bundle = await this.load(bundleName);

    this.emitEvent('bundle:reloaded', bundleName, bundle);

    return bundle;
  }

  /**
   * Get a bundle
   */
  get(bundleName: string): Bundle | undefined {
    return this.bundles.get(bundleName);
  }

  /**
   * Get all bundles
   */
  getAll(): Bundle[] {
    return Array.from(this.bundles.values());
  }

  /**
   * Enable a bundle
   */
  async enable(bundleName: string): Promise<void> {
    this.assertInitialized();

    await this.repository.enableByName(bundleName);
    this.logger.info(`Enabled bundle: ${bundleName}`);
    this.emitEvent('bundle:enabled', bundleName);

    // Load if not already loaded
    if (!this.bundles.has(bundleName)) {
      await this.load(bundleName);
    }
  }

  /**
   * Disable a bundle
   */
  async disable(bundleName: string): Promise<void> {
    this.assertInitialized();

    await this.repository.disableByName(bundleName);
    this.logger.info(`Disabled bundle: ${bundleName}`);
    this.emitEvent('bundle:disabled', bundleName);

    // Unload if loaded
    if (this.bundles.has(bundleName)) {
      await this.unload(bundleName);
    }
  }

  /**
   * Resolve bundle dependencies
   */
  private async resolveDependencies(config: BundleConfig): Promise<string[]> {
    const dependencies: string[] = [];

    if (config.dependencies) {
      for (const depName of Object.keys(config.dependencies)) {
        const dbBundle = await this.repository.findByName(depName);

        if (!dbBundle) {
          throw new NodeCGError(
            ErrorCodes.BUNDLE_DEPENDENCY_NOT_FOUND,
            `Dependency ${depName} not found for bundle ${config.name}`
          );
        }

        if (!dbBundle.enabled) {
          throw new NodeCGError(
            ErrorCodes.BUNDLE_DEPENDENCY_DISABLED,
            `Dependency ${depName} is disabled for bundle ${config.name}`
          );
        }

        dependencies.push(depName);
      }
    }

    return dependencies;
  }

  /**
   * Get bundles that depend on the given bundle
   */
  private getDependents(bundleName: string): string[] {
    const dependents: string[] = [];

    for (const [name, bundle] of this.bundles) {
      if (bundle.dependencies.includes(bundleName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * Start hot reload watchers for all loaded bundles
   */
  private async startHotReload(): Promise<void> {
    this.logger.info('Starting hot reload watchers...');

    for (const [name, bundle] of this.bundles) {
      await this.watchBundle(name, bundle.dir);
    }
  }

  /**
   * Watch a bundle for changes
   */
  private async watchBundle(bundleName: string, bundleDir: string): Promise<void> {
    // eslint-disable-next-line no-undef
    const controller = new AbortController();
    this.watchers.set(bundleName, controller);

    try {
      const watcher = watch(bundleDir, {
        recursive: true,
        signal: controller.signal,
      });

      // Handle file changes in background
      (async () => {
        try {
          for await (const event of watcher) {
            this.logger.debug(`File changed in ${bundleName}: ${event.filename}`);

            // Debounce reload (wait 500ms for more changes)

            setTimeout(() => {
              this.reload(bundleName).catch((error) => {
                this.logger.error(`Hot reload failed for ${bundleName}:`, error);
              });
            }, 500);

            break; // Only handle first change, then let reload restart watcher
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            this.logger.error(`Watcher error for ${bundleName}:`, error);
          }
        }
      })();

      this.logger.debug(`Started watching bundle: ${bundleName}`);
    } catch (error) {
      this.logger.error(`Failed to watch bundle ${bundleName}:`, error);
    }
  }

  /**
   * Get bundle statistics
   */
  getStatistics(): {
    total: number;
    loaded: number;
    bundles: Array<{
      name: string;
      version: string;
      enabled: boolean;
      loadedAt?: Date;
      dependencies: string[];
    }>;
  } {
    const bundles = Array.from(this.bundles.values());

    return {
      total: bundles.length,
      loaded: bundles.length,
      bundles: bundles.map((b) => ({
        name: b.config.name,
        version: b.config.version,
        enabled: b.enabled,
        loadedAt: b.loadedAt,
        dependencies: b.dependencies,
      })),
    };
  }

  /**
   * Check if a bundle is loaded
   */
  isLoaded(bundleName: string): boolean {
    return this.bundles.has(bundleName);
  }

  /**
   * Get bundle directory path
   */
  getBundleDir(bundleName: string): string | undefined {
    return this.bundles.get(bundleName)?.dir;
  }

  /**
   * Get bundles directory
   */
  getBundlesDir(): string {
    return this.bundlesDir;
  }
}
