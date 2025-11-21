/**
 * Plugin System Types for NodeCG Next
 * Comprehensive plugin architecture with lifecycle management and hooks
 */

import type { Logger } from './core';

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin homepage URL */
  homepage?: string;
  /** Plugin repository URL */
  repository?: string;
  /** Plugin license */
  license?: string;
  /** Minimum NodeCG version required (semver range) */
  nodecgVersion: string;
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[];
  /** Plugin configuration schema */
  configSchema?: Record<string, unknown>;
  /** Plugin tags/categories */
  tags?: string[];
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  config?: Record<string, unknown>;
  /** Plugin priority (higher = loads earlier) */
  priority?: number;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Plugin configuration */
  config: PluginConfig;
  /** Logger instance for this plugin */
  logger: Logger;
  /** NodeCG event bus */
  eventBus: import('./core').EventBus;
  /** NodeCG configuration */
  nodecgConfig: import('./core').NodeCGConfig;
  /** Emit events to other plugins */
  emit(event: string, ...args: unknown[]): void;
  /** Listen to events from other plugins */
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  /** Get service by name */
  getService<T>(name: string): T | undefined;
  /** Register a service */
  registerService(name: string, service: unknown): void;
}

/**
 * Plugin hook types
 */
export enum PluginHookType {
  /** Before server starts */
  BEFORE_SERVER_START = 'before:server:start',
  /** After server starts */
  AFTER_SERVER_START = 'after:server:start',
  /** Before server stops */
  BEFORE_SERVER_STOP = 'before:server:stop',
  /** After server stops */
  AFTER_SERVER_STOP = 'after:server:stop',
  /** Before bundle loads */
  BEFORE_BUNDLE_LOAD = 'before:bundle:load',
  /** After bundle loads */
  AFTER_BUNDLE_LOAD = 'after:bundle:load',
  /** Before replicant changes */
  BEFORE_REPLICANT_CHANGE = 'before:replicant:change',
  /** After replicant changes */
  AFTER_REPLICANT_CHANGE = 'after:replicant:change',
  /** Before user authentication */
  BEFORE_USER_AUTH = 'before:user:auth',
  /** After user authentication */
  AFTER_USER_AUTH = 'after:user:auth',
}

/**
 * Plugin hook handler
 */
export type PluginHookHandler<T = unknown> = (
  context: PluginHookContext<T>
) => Promise<void> | void;

/**
 * Plugin hook context
 */
export interface PluginHookContext<T = unknown> {
  /** Hook type */
  type: PluginHookType;
  /** Hook data */
  data: T;
  /** Plugin context */
  plugin: PluginContext;
  /** Cancel the operation (if supported) */
  cancel?: () => void;
  /** Modify the data (if supported) */
  setData?: (data: T) => void;
}

/**
 * Base plugin interface
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;
  /** Current plugin state */
  readonly state: PluginState;

  /**
   * Initialize the plugin
   * Called once when plugin is loaded
   */
  initialize(context: PluginContext): Promise<void> | void;

  /**
   * Start the plugin
   * Called when plugin should become active
   */
  start(): Promise<void> | void;

  /**
   * Stop the plugin
   * Called when plugin should stop
   */
  stop(): Promise<void> | void;

  /**
   * Destroy the plugin
   * Called when plugin is being unloaded
   */
  destroy(): Promise<void> | void;

  /**
   * Register plugin hooks
   * Returns map of hook type to handler
   */
  registerHooks?(): Map<PluginHookType, PluginHookHandler>;
}

/**
 * Plugin factory function
 */
export type PluginFactory = (context: PluginContext) => Plugin | Promise<Plugin>;

/**
 * Plugin module export
 */
export interface PluginModule {
  /** Plugin factory or class */
  default: PluginFactory | (new (context: PluginContext) => Plugin);
  /** Plugin metadata (if not provided by factory) */
  metadata?: PluginMetadata;
}

/**
 * Plugin error
 */
export class PluginError extends Error {
  constructor(
    public readonly pluginId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[Plugin: ${pluginId}] ${message}`);
    this.name = 'PluginError';
  }
}

/**
 * Plugin dependency error
 */
export class PluginDependencyError extends PluginError {
  constructor(pluginId: string, missingDependencies: string[]) {
    super(pluginId, `Missing dependencies: ${missingDependencies.join(', ')}`);
    this.name = 'PluginDependencyError';
  }
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  /** Plugin instance */
  plugin: Plugin;
  /** Plugin context */
  context: PluginContext;
  /** Plugin state */
  state: PluginState;
  /** Load timestamp */
  loadedAt: Date;
  /** Start timestamp */
  startedAt?: Date;
  /** Error if in error state */
  error?: Error;
}

/**
 * Plugin Manager interface
 */
export interface PluginManager {
  /** Register a plugin */
  register(plugin: Plugin): Promise<void>;
  /** Unregister a plugin */
  unregister(pluginId: string): Promise<void>;
  /** Get a plugin */
  get(pluginId: string): Plugin | undefined;
  /** Get all plugins */
  getAll(): Plugin[];
  /** Load plugin from path */
  load(pluginPath: string): Promise<Plugin>;
  /** Start a plugin */
  startPlugin(pluginId: string): Promise<void>;
  /** Stop a plugin */
  stopPlugin(pluginId: string): Promise<void>;
  /** Execute a hook */
  executeHook(hookType: PluginHookType, data?: unknown): Promise<void>;
  /** Get plugin registry entry */
  getRegistryEntry(pluginId: string): PluginRegistryEntry | undefined;
}
