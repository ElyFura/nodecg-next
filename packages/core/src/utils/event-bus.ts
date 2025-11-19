/**
 * Event Bus Implementation
 * Provides pub/sub functionality for decoupled communication across the system
 */

import { EventBus as IEventBus } from '@nodecg/types';
import { EventEmitter } from 'events';
import { createLogger } from './logger';

const logger = createLogger({ level: 'debug' });

/**
 * Event Bus implementation using Node.js EventEmitter
 * Provides type-safe pub/sub pattern for system-wide events
 */
export class EventBus extends EventEmitter implements IEventBus {
  private eventCounts: Map<string, number>;
  private maxListeners: number;

  constructor(maxListeners = 100) {
    super();
    this.eventCounts = new Map();
    this.maxListeners = maxListeners;
    this.setMaxListeners(maxListeners);
  }

  /**
   * Emit an event with arguments
   */
  emit(event: string, ...args: unknown[]): boolean {
    logger.debug(`Event emitted: ${event}`, { args: args.length });

    // Track event count
    const count = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, count + 1);

    return super.emit(event, ...args);
  }

  /**
   * Register an event handler
   * Returns an unsubscribe function
   */
  on(event: string, handler: (...args: unknown[]) => void): (() => void) & this {
    logger.debug(`Listener registered for event: ${event}`);
    super.on(event, handler);

    // Return unsubscribe function with 'this' for chaining
    const unsubscribe = () => {
      this.removeListener(event, handler);
    };
    return Object.assign(unsubscribe, this);
  }

  /**
   * Register a one-time event handler
   * Returns an unsubscribe function
   */
  once(event: string, handler: (...args: unknown[]) => void): (() => void) & this {
    logger.debug(`One-time listener registered for event: ${event}`);
    super.once(event, handler);

    // Return unsubscribe function with 'this' for chaining
    const unsubscribe = () => {
      this.removeListener(event, handler);
    };
    return Object.assign(unsubscribe, this);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: (...args: unknown[]) => void): this {
    logger.debug(`Listener removed for event: ${event}`);
    super.off(event, handler);
    return this;
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners(event?: string): this {
    if (event) {
      logger.debug(`All listeners removed for event: ${event}`);
    } else {
      logger.debug('All listeners removed for all events');
    }
    return super.removeAllListeners(event);
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return super.listenerCount(event);
  }

  /**
   * Get all registered event names
   */
  getEventNames(): string[] {
    return super.eventNames() as string[];
  }

  /**
   * Get statistics about events
   */
  getStatistics(): {
    totalEvents: number;
    events: Array<{ name: string; emitCount: number; listenerCount: number }>;
    totalListeners: number;
  } {
    const events = this.getEventNames();
    const eventStats = events.map((name) => ({
      name,
      emitCount: this.eventCounts.get(name) || 0,
      listenerCount: this.listenerCount(name),
    }));

    const totalListeners = eventStats.reduce((sum, event) => sum + event.listenerCount, 0);

    return {
      totalEvents: events.length,
      events: eventStats.sort((a, b) => b.emitCount - a.emitCount),
      totalListeners,
    };
  }

  /**
   * Reset event emit counts
   */
  resetStatistics(): void {
    this.eventCounts.clear();
    logger.debug('Event statistics reset');
  }

  /**
   * Check if there are listeners for an event
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Wait for an event to be emitted
   * Returns a promise that resolves with the event arguments
   */
  waitFor<T = unknown>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (...args: unknown[]) => {
        if (timeoutId) {
          // eslint-disable-next-line no-undef
          clearTimeout(timeoutId);
        }
        resolve(args.length === 1 ? (args[0] as T) : (args as T));
      };

      this.once(event, handler);

      if (timeout) {
        // eslint-disable-next-line no-undef
        timeoutId = setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Emit an event asynchronously
   * Allows event handlers to return promises and waits for all to complete
   */
  async emitAsync(event: string, ...args: unknown[]): Promise<void> {
    logger.debug(`Async event emitted: ${event}`, { args: args.length });

    const listeners = this.listeners(event) as Array<(...args: unknown[]) => unknown>;

    if (listeners.length === 0) {
      return;
    }

    // Track event count
    const count = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, count + 1);

    // Execute all listeners and wait for promises
    const results = listeners.map((listener) => {
      try {
        return Promise.resolve(listener(...args));
      } catch (error) {
        logger.error(`Error in async event handler for ${event}:`, error);
        return Promise.resolve(); // Don't fail the whole chain
      }
    });

    await Promise.all(results);
  }

  /**
   * Create a scoped event bus that prefixes all events
   */
  scope(prefix: string): EventBus {
    const scoped = new EventBus(this.maxListeners);

    // Proxy emit to add prefix
    const originalEmit = scoped.emit.bind(scoped);
    scoped.emit = (event: string, ...args: unknown[]): boolean => {
      return this.emit(`${prefix}:${event}`, ...args) && originalEmit(event, ...args);
    };

    // Proxy on to add prefix
    const originalOn = scoped.on.bind(scoped);
    scoped.on = ((event: string, handler: (...args: unknown[]) => void) => {
      this.on(`${prefix}:${event}`, handler);
      return originalOn(event, handler);
    }) as typeof scoped.on;

    return scoped;
  }
}

/**
 * Global event bus instance
 */
let globalEventBus: EventBus | null = null;

/**
 * Get or create the global event bus
 */
export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
    logger.info('Global event bus initialized');
  }
  return globalEventBus;
}

/**
 * Create a new event bus instance
 */
export function createEventBus(maxListeners = 100): EventBus {
  return new EventBus(maxListeners);
}

/**
 * Common event names used throughout the system
 */
export const Events = {
  // Server events
  SERVER_STARTED: 'server:started',
  SERVER_STOPPED: 'server:stopped',
  SERVER_ERROR: 'server:error',

  // Replicant events
  REPLICANT_CREATED: 'replicant:created',
  REPLICANT_UPDATED: 'replicant:updated',
  REPLICANT_DELETED: 'replicant:deleted',
  REPLICANT_DECLARED: 'replicant:declared',

  // Bundle events
  BUNDLE_LOADED: 'bundle:loaded',
  BUNDLE_UNLOADED: 'bundle:unloaded',
  BUNDLE_ENABLED: 'bundle:enabled',
  BUNDLE_DISABLED: 'bundle:disabled',
  BUNDLE_ERROR: 'bundle:error',

  // Asset events
  ASSET_UPLOADED: 'asset:uploaded',
  ASSET_DELETED: 'asset:deleted',
  ASSET_UPDATED: 'asset:updated',

  // User events
  USER_CONNECTED: 'user:connected',
  USER_DISCONNECTED: 'user:disconnected',
  USER_AUTHENTICATED: 'user:authenticated',

  // WebSocket events
  WEBSOCKET_CONNECTION: 'websocket:connection',
  WEBSOCKET_DISCONNECTION: 'websocket:disconnection',
  WEBSOCKET_ERROR: 'websocket:error',

  // System events
  SYSTEM_READY: 'system:ready',
  SYSTEM_SHUTDOWN: 'system:shutdown',
  SYSTEM_ERROR: 'system:error',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
