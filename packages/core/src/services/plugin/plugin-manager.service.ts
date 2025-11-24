/**
 * Plugin Manager Service
 * Manages plugin lifecycle, loading, and hooks
 */

import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Logger } from 'pino';
import type {
  Plugin,
  PluginManager as IPluginManager,
  PluginContext,
  PluginRegistryEntry,
  PluginConfig,
  PluginHookType,
  PluginMetadata,
  PluginModule,
  PluginFactory,
  PluginHookHandler,
} from '@nodecg/types';
import { PluginError, PluginDependencyError, PluginState } from '@nodecg/types';
import type { EventBus } from '../../utils/event-bus';
import type { NodeCGConfig } from '@nodecg/types';

export interface PluginManagerOptions {
  logger: Logger;
  eventBus: EventBus;
  config: NodeCGConfig;
  pluginsDir?: string;
}

/**
 * Plugin Manager Service
 * Handles plugin discovery, loading, lifecycle management, and hooks
 */
export class PluginManagerService implements IPluginManager {
  private readonly logger: Logger;
  private readonly eventBus: EventBus;
  private readonly config: NodeCGConfig;
  private readonly pluginsDir: string;

  private readonly registry = new Map<string, PluginRegistryEntry>();
  private readonly hooks = new Map<
    PluginHookType,
    Set<{
      pluginId: string;
      handler: PluginHookHandler;
    }>
  >();
  private readonly services = new Map<string, unknown>();

  constructor(options: PluginManagerOptions) {
    this.logger = options.logger.child({ component: 'PluginManager' });
    this.eventBus = options.eventBus;
    this.config = options.config;
    this.pluginsDir = options.pluginsDir || resolve(process.cwd(), 'plugins');
  }

  /**
   * Discover and load all plugins from plugins directory
   */
  public async discoverPlugins(): Promise<void> {
    this.logger.info(`Discovering plugins in ${this.pluginsDir}`);

    try {
      const entries = await readdir(this.pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = join(this.pluginsDir, entry.name);
          try {
            await this.load(pluginPath);
          } catch (error) {
            this.logger.error({ error, pluginPath }, `Failed to load plugin from ${pluginPath}`);
          }
        }
      }

      this.logger.info(`Discovered ${this.registry.size} plugins`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      this.logger.warn(`Plugins directory not found: ${this.pluginsDir}`);
    }
  }

  /**
   * Load a plugin from a path
   */
  public async load(pluginPath: string): Promise<Plugin> {
    this.logger.info(`Loading plugin from ${pluginPath}`);

    try {
      // Import plugin module
      const module = (await import(pluginPath)) as PluginModule;

      if (!module.default) {
        throw new Error('Plugin must export a default factory or class');
      }

      // Read package.json for metadata
      const packagePath = join(pluginPath, 'package.json');
      const packageJson = await import(packagePath);
      const metadata: PluginMetadata = packageJson.nodecg?.plugin || module.metadata;

      if (!metadata) {
        throw new Error(
          'Plugin metadata not found in package.json (nodecg.plugin) or module export'
        );
      }

      // Get plugin configuration
      const pluginConfig: PluginConfig = {
        enabled: true,
        config: this.config.plugins?.[metadata.id] || {},
        priority: 0,
      };

      // Create plugin context
      const context = this.createPluginContext(metadata, pluginConfig);

      // Create plugin instance
      let plugin: Plugin;
      if (typeof module.default === 'function') {
        // Try as factory function first
        try {
          plugin = await (module.default as PluginFactory)(context);
        } catch {
          // If factory fails, try as class constructor
          plugin = new (module.default as new (context: PluginContext) => Plugin)(context);
        }
      } else {
        throw new Error('Plugin default export must be a factory function or class');
      }

      // Register the plugin with context
      await this.register(plugin, context);

      return plugin;
    } catch (error) {
      throw new PluginError(
        pluginPath,
        `Failed to load plugin: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Register a plugin
   */
  public async register(plugin: Plugin, context?: PluginContext): Promise<void> {
    const { id } = plugin.metadata;

    if (this.registry.has(id)) {
      throw new PluginError(id, 'Plugin already registered');
    }

    // Check dependencies
    if (plugin.metadata.dependencies) {
      const missingDeps = plugin.metadata.dependencies.filter((dep) => !this.registry.has(dep));
      if (missingDeps.length > 0) {
        throw new PluginDependencyError(id, missingDeps);
      }
    }

    // Create context if not provided
    if (!context) {
      context = this.createPluginContext(plugin.metadata, {
        enabled: true,
        config: {},
        priority: 0,
      });
    }

    // Create registry entry
    const entry: PluginRegistryEntry = {
      plugin,
      context,
      state: plugin.state,
      loadedAt: new Date(),
    };

    this.registry.set(id, entry);

    // Register hooks
    if (plugin.registerHooks) {
      const hooks = plugin.registerHooks();
      for (const [hookType, handler] of hooks) {
        this.registerHook(id, hookType, handler);
      }
    }

    this.logger.info(`Registered plugin: ${plugin.metadata.name} (${id})`);
  }

  /**
   * Unregister a plugin
   */
  public async unregister(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginError(pluginId, 'Plugin not found');
    }

    // Stop plugin if running
    if (entry.state === PluginState.RUNNING) {
      await this.stopPlugin(pluginId);
    }

    // Destroy plugin
    await entry.plugin.destroy();

    // Remove hooks
    for (const [hookType, handlers] of this.hooks) {
      const filtered = Array.from(handlers).filter((h) => h.pluginId !== pluginId);
      this.hooks.set(hookType, new Set(filtered));
    }

    // Remove from registry
    this.registry.delete(pluginId);

    this.logger.info(`Unregistered plugin: ${pluginId}`);
  }

  /**
   * Get a plugin by ID
   */
  public get(pluginId: string): Plugin | undefined {
    return this.registry.get(pluginId)?.plugin;
  }

  /**
   * Get all plugins
   */
  public getAll(): Plugin[] {
    return Array.from(this.registry.values()).map((entry) => entry.plugin);
  }

  /**
   * Get plugin registry entry
   */
  public getRegistryEntry(pluginId: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Start a plugin
   */
  public async startPlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginError(pluginId, 'Plugin not found');
    }

    if (entry.state === PluginState.RUNNING) {
      this.logger.warn(`Plugin ${pluginId} is already running`);
      return;
    }

    try {
      await entry.plugin.start();
      entry.state = entry.plugin.state;
      entry.startedAt = new Date();
      this.logger.info(`Started plugin: ${pluginId}`);
    } catch (error) {
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error : new Error(String(error));
      throw new PluginError(
        pluginId,
        `Failed to start plugin: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Stop a plugin
   */
  public async stopPlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new PluginError(pluginId, 'Plugin not found');
    }

    if (entry.state !== PluginState.RUNNING) {
      this.logger.warn(`Plugin ${pluginId} is not running`);
      return;
    }

    try {
      await entry.plugin.stop();
      entry.state = entry.plugin.state;
      this.logger.info(`Stopped plugin: ${pluginId}`);
    } catch (error) {
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error : new Error(String(error));
      throw new PluginError(
        pluginId,
        `Failed to stop plugin: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Start all plugins
   */
  public async startAll(): Promise<void> {
    this.logger.info('Starting all plugins');

    // Sort by priority (higher first)
    const plugins = Array.from(this.registry.entries()).sort((a, b) => {
      const aPriority = a[1].context.config.priority || 0;
      const bPriority = b[1].context.config.priority || 0;
      return bPriority - aPriority;
    });

    for (const [pluginId] of plugins) {
      try {
        await this.startPlugin(pluginId);
      } catch (error) {
        this.logger.error({ error, pluginId }, `Failed to start plugin ${pluginId}`);
      }
    }

    this.logger.info('All plugins started');
  }

  /**
   * Stop all plugins
   */
  public async stopAll(): Promise<void> {
    this.logger.info('Stopping all plugins');

    for (const pluginId of this.registry.keys()) {
      try {
        await this.stopPlugin(pluginId);
      } catch (error) {
        this.logger.error({ error, pluginId }, `Failed to stop plugin ${pluginId}`);
      }
    }

    this.logger.info('All plugins stopped');
  }

  /**
   * Register a plugin hook
   */
  private registerHook(
    pluginId: string,
    hookType: PluginHookType,
    handler: (context: any) => Promise<void> | void
  ): void {
    if (!this.hooks.has(hookType)) {
      this.hooks.set(hookType, new Set());
    }

    this.hooks.get(hookType)!.add({ pluginId, handler });
    this.logger.debug(`Registered hook ${hookType} for plugin ${pluginId}`);
  }

  /**
   * Execute a hook
   */
  public async executeHook(hookType: PluginHookType, data?: unknown): Promise<void> {
    const handlers = this.hooks.get(hookType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    this.logger.debug(`Executing hook ${hookType} with ${handlers.size} handlers`);

    for (const { pluginId, handler } of handlers) {
      const entry = this.registry.get(pluginId);
      if (!entry) continue;

      const context = {
        type: hookType,
        data,
        plugin: entry.context,
      };

      try {
        await handler(context);
      } catch (error) {
        this.logger.error(
          { error, pluginId, hookType },
          `Error executing hook ${hookType} in plugin ${pluginId}`
        );
      }
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(metadata: PluginMetadata, config: PluginConfig): PluginContext {
    const pluginLogger = this.logger.child({ plugin: metadata.id });

    return {
      metadata,
      config,
      logger: pluginLogger,
      eventBus: this.eventBus,
      nodecgConfig: this.config,
      emit: (event: string, ...args: unknown[]) => {
        this.eventBus.emit(`plugin:${metadata.id}:${event}`, ...args);
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        const fullEvent = `plugin:${metadata.id}:${event}`;
        this.eventBus.on(fullEvent, handler);
        return () => this.eventBus.off(fullEvent, handler);
      },
      getService: <T>(name: string): T | undefined => {
        return this.services.get(name) as T | undefined;
      },
      registerService: (name: string, service: unknown) => {
        if (this.services.has(name)) {
          throw new Error(`Service ${name} already registered`);
        }
        this.services.set(name, service);
        pluginLogger.info(`Registered service: ${name}`);
      },
    };
  }

  /**
   * Get plugin statistics
   */
  public getStats() {
    const states = {
      unloaded: 0,
      loading: 0,
      loaded: 0,
      starting: 0,
      running: 0,
      stopping: 0,
      stopped: 0,
      error: 0,
    };

    for (const entry of this.registry.values()) {
      states[entry.state as keyof typeof states]++;
    }

    return {
      total: this.registry.size,
      states,
      hooks: this.hooks.size,
      services: this.services.size,
    };
  }
}
