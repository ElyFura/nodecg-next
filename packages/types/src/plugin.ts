/**
 * Plugin type definitions for NodeCG Next
 */

export interface PluginMetadata {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Compatible NodeCG versions */
  compatibleRange?: string;
}

export interface PluginHookContext {
  /** NodeCG logger instance */
  logger: import('./core').Logger;
  /** NodeCG event bus */
  eventBus: import('./core').EventBus;
  /** NodeCG configuration */
  config: import('./core').NodeCGConfig;
}

export interface Plugin {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Initialize the plugin */
  init(context: PluginHookContext): Promise<void>;
  /** Destroy the plugin */
  destroy?(): Promise<void>;
  /** Register hooks */
  hooks?: {
    /** Before server starts */
    'server:before-start'?: (context: PluginHookContext) => Promise<void>;
    /** After server starts */
    'server:after-start'?: (context: PluginHookContext) => Promise<void>;
    /** Before server stops */
    'server:before-stop'?: (context: PluginHookContext) => Promise<void>;
    /** After server stops */
    'server:after-stop'?: (context: PluginHookContext) => Promise<void>;
    /** Before bundle loads */
    'bundle:before-load'?: (
      context: PluginHookContext,
      bundle: import('./bundle').Bundle
    ) => Promise<void>;
    /** After bundle loads */
    'bundle:after-load'?: (
      context: PluginHookContext,
      bundle: import('./bundle').Bundle
    ) => Promise<void>;
  };
}

export interface PluginManager {
  /** Register a plugin */
  register(plugin: Plugin): Promise<void>;
  /** Unregister a plugin */
  unregister(pluginName: string): Promise<void>;
  /** Get a plugin */
  get(pluginName: string): Plugin | undefined;
  /** Get all plugins */
  getAll(): Plugin[];
  /** Execute a hook */
  executeHook(hookName: string, ...args: unknown[]): Promise<void>;
}
