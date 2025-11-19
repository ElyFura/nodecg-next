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
  private watchers: Map<string, AbortController> = new Map();

  constructor(options: BundleManagerOptions = {}) {
    super('BundleManager', options);
    this.bundlesDir = options.bundlesDir || join(process.cwd(), 'bundles');
    this.enableHotReload = options.enableHotReload ?? true;
    this.repository = getRepositories(this.logger).bundle;
  }

  /**
   * Initialize the bundle manager
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info(`Bundle directory: ${this.bundlesDir}`);
    this.logger.info(`Hot reload: ${this.enableHotReload ? 'enabled' : 'disabled'}`);

    // Discover and load bundles
    await this.discoverBundles();
    await this.loadEnabledBundles();

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
    this.assertInitialized();

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
      throw new NodeCGError(
        ErrorCodes.BUNDLE_INVALID_CONFIG,
        'NodeCG configuration is required'
      );
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
   * Load all enabled bundles
   */
  private async loadEnabledBundles(): Promise<void> {
    const enabledBundles = await this.repository.findEnabled();

    for (const dbBundle of enabledBundles) {
      try {
        await this.load(dbBundle.name);
      } catch (error) {
        this.logger.error(`Failed to load bundle ${dbBundle.name}:`, error);
      }
    }
  }

  /**
   * Load a bundle
   */
  async load(bundleName: string): Promise<Bundle> {
    this.assertInitialized();

    // Check if already loaded
    if (this.bundles.has(bundleName)) {
      this.logger.warn(`Bundle ${bundleName} is already loaded`);
      return this.bundles.get(bundleName)!;
    }

    try {
      // Get bundle from database
      const dbBundle = await this.repository.findByName(bundleName);
      if (!dbBundle) {
        throw new NodeCGError(ErrorCodes.BUNDLE_NOT_FOUND, `Bundle ${bundleName} not found`);
      }

      if (!dbBundle.enabled) {
        throw new NodeCGError(
          ErrorCodes.BUNDLE_DISABLED,
          `Bundle ${bundleName} is disabled`
        );
      }

      const config = JSON.parse(dbBundle.config) as BundleConfig;
      const bundleDir = join(this.bundlesDir, bundleName);

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
      try {
        await stat(extensionPath);
        // Dynamic import for extension
        extension = await import(extensionPath);
        this.logger.debug(`Loaded extension for bundle: ${bundleName}`);
      } catch (error) {
        // Extension is optional
        this.logger.debug(`No extension found for bundle: ${bundleName}`);
      }

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
        if (typeof (bundle.extension as any).stop === 'function') {
          await (bundle.extension as any).stop();
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
