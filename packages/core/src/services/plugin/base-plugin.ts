/**
 * Base Plugin Class
 * Abstract base class that plugins can extend
 */

import type {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginState,
  PluginHookType,
  PluginHookHandler,
} from '@nodecg/types';

/**
 * Abstract base class for NodeCG plugins
 */
export abstract class BasePlugin implements Plugin {
  private _state: PluginState = 'unloaded' as PluginState;
  private _context!: PluginContext;

  constructor(public readonly metadata: PluginMetadata) {}

  /**
   * Current plugin state
   */
  public get state(): PluginState {
    return this._state;
  }

  /**
   * Plugin context (available after initialize)
   */
  protected get context(): PluginContext {
    return this._context;
  }

  /**
   * Logger instance
   */
  protected get logger() {
    return this._context.logger;
  }

  /**
   * Initialize the plugin
   */
  public async initialize(context: PluginContext): Promise<void> {
    this._context = context;
    this._state = 'loading' as PluginState;

    try {
      await this.onInitialize();
      this._state = 'loaded' as PluginState;
      this.logger.info(`Plugin ${this.metadata.name} initialized`);
    } catch (error) {
      this._state = 'error' as PluginState;
      throw error;
    }
  }

  /**
   * Start the plugin
   */
  public async start(): Promise<void> {
    if (this._state !== ('loaded' as PluginState) && this._state !== ('stopped' as PluginState)) {
      throw new Error(`Cannot start plugin in state: ${this._state}`);
    }

    this._state = 'starting' as PluginState;

    try {
      await this.onStart();
      this._state = 'running' as PluginState;
      this.logger.info(`Plugin ${this.metadata.name} started`);
    } catch (error) {
      this._state = 'error' as PluginState;
      throw error;
    }
  }

  /**
   * Stop the plugin
   */
  public async stop(): Promise<void> {
    if (this._state !== ('running' as PluginState)) {
      throw new Error(`Cannot stop plugin in state: ${this._state}`);
    }

    this._state = 'stopping' as PluginState;

    try {
      await this.onStop();
      this._state = 'stopped' as PluginState;
      this.logger.info(`Plugin ${this.metadata.name} stopped`);
    } catch (error) {
      this._state = 'error' as PluginState;
      throw error;
    }
  }

  /**
   * Destroy the plugin
   */
  public async destroy(): Promise<void> {
    try {
      if (this._state === ('running' as PluginState)) {
        await this.stop();
      }

      await this.onDestroy();
      this._state = 'unloaded' as PluginState;
      this.logger.info(`Plugin ${this.metadata.name} destroyed`);
    } catch (error) {
      this._state = 'error' as PluginState;
      throw error;
    }
  }

  /**
   * Register plugin hooks
   */
  public registerHooks?(): Map<PluginHookType, PluginHookHandler>;

  /**
   * Override to implement initialization logic
   */
  protected abstract onInitialize(): Promise<void> | void;

  /**
   * Override to implement start logic
   */
  protected abstract onStart(): Promise<void> | void;

  /**
   * Override to implement stop logic
   */
  protected abstract onStop(): Promise<void> | void;

  /**
   * Override to implement destroy logic
   */
  protected onDestroy(): Promise<void> | void {
    // Default: no-op
  }

  /**
   * Emit event to other plugins
   */
  protected emit(event: string, ...args: unknown[]): void {
    this.context.emit(event, ...args);
  }

  /**
   * Listen to events from other plugins
   */
  protected on(event: string, handler: (...args: unknown[]) => void): () => void {
    return this.context.on(event, handler);
  }

  /**
   * Get a service
   */
  protected getService<T>(name: string): T | undefined {
    return this.context.getService<T>(name);
  }

  /**
   * Register a service
   */
  protected registerService(name: string, service: unknown): void {
    this.context.registerService(name, service);
  }
}
