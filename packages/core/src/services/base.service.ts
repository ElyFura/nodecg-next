/**
 * Base Service Class
 * Provides common functionality for all services in the system
 */

import { EventBus, getEventBus } from '../utils/event-bus';
import { Logger, createLogger } from '../utils/logger';
import { NodeCGConfig } from '@nodecg/types';

export interface ServiceOptions {
  config?: NodeCGConfig;
  logger?: Logger;
  eventBus?: EventBus;
}

/**
 * Base service class that all services should extend
 * Provides logging, events, and lifecycle management
 */
export abstract class BaseService {
  protected config?: NodeCGConfig;
  protected logger: Logger;
  protected eventBus: EventBus;
  protected initialized: boolean = false;
  protected serviceName: string;

  constructor(serviceName: string, options: ServiceOptions = {}) {
    this.serviceName = serviceName;
    this.config = options.config;
    this.logger = options.logger || createLogger({ level: 'info' });
    this.eventBus = options.eventBus || getEventBus();
  }

  /**
   * Initialize the service
   * Must be called before using the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn(`${this.serviceName} is already initialized`);
      return;
    }

    this.logger.info(`Initializing ${this.serviceName}...`);

    try {
      await this.onInitialize();
      this.initialized = true;
      this.eventBus.emit(`service:${this.serviceName}:initialized`);
      this.logger.info(`${this.serviceName} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.serviceName}:`, error);
      this.eventBus.emit(`service:${this.serviceName}:error`, error);
      throw error;
    }
  }

  /**
   * Shutdown the service
   * Cleanup resources and connections
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(`${this.serviceName} is not initialized`);
      return;
    }

    this.logger.info(`Shutting down ${this.serviceName}...`);

    try {
      await this.onShutdown();
      this.initialized = false;
      this.eventBus.emit(`service:${this.serviceName}:shutdown`);
      this.logger.info(`${this.serviceName} shut down successfully`);
    } catch (error) {
      this.logger.error(`Failed to shut down ${this.serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Assert that service is initialized
   * Throws error if not initialized
   */
  protected assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.serviceName} is not initialized. Call initialize() first.`);
    }
  }

  /**
   * Emit a service-specific event
   */
  protected emitEvent(event: string, ...args: unknown[]): void {
    this.eventBus.emit(`service:${this.serviceName}:${event}`, ...args);
  }

  /**
   * Subscribe to a service-specific event
   */
  protected onEvent(event: string, handler: (...args: unknown[]) => void): () => void {
    return this.eventBus.on(`service:${this.serviceName}:${event}`, handler);
  }

  /**
   * Hook called during initialization
   * Override in subclasses to perform initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass
  }

  /**
   * Hook called during shutdown
   * Override in subclasses to perform cleanup logic
   */
  protected async onShutdown(): Promise<void> {
    // Override in subclass
  }

  /**
   * Get a child logger with additional context
   */
  protected getChildLogger(context: Record<string, unknown>): Logger {
    return this.logger.child(context);
  }
}

/**
 * Service registry for managing multiple services
 */
export class ServiceRegistry {
  private services: Map<string, BaseService> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger({ level: 'info' });
  }

  /**
   * Register a service
   */
  register(service: BaseService): void {
    const name = service.getServiceName();

    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    this.services.set(name, service);
    this.logger.info(`Service registered: ${name}`);
  }

  /**
   * Get a service by name
   */
  get<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Initialize all services
   */
  async initializeAll(): Promise<void> {
    this.logger.info('Initializing all services...');

    const promises = Array.from(this.services.values()).map((service) =>
      service.initialize().catch((error) => {
        this.logger.error(`Failed to initialize ${service.getServiceName()}:`, error);
        throw error;
      })
    );

    await Promise.all(promises);
    this.logger.info('All services initialized');
  }

  /**
   * Shutdown all services
   */
  async shutdownAll(): Promise<void> {
    this.logger.info('Shutting down all services...');

    const promises = Array.from(this.services.values()).map((service) =>
      service.shutdown().catch((error) => {
        this.logger.error(`Failed to shut down ${service.getServiceName()}:`, error);
        // Don't throw, continue shutting down other services
      })
    );

    await Promise.all(promises);
    this.logger.info('All services shut down');
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    total: number;
    initialized: number;
    services: Array<{ name: string; initialized: boolean }>;
  } {
    const services = Array.from(this.services.values());

    return {
      total: services.length,
      initialized: services.filter((s) => s.isInitialized()).length,
      services: services.map((s) => ({
        name: s.getServiceName(),
        initialized: s.isInitialized(),
      })),
    };
  }

  /**
   * Clear all services (for testing)
   */
  clear(): void {
    this.services.clear();
  }
}

/**
 * Global service registry instance
 */
let globalRegistry: ServiceRegistry | null = null;

/**
 * Get the global service registry
 */
export function getServiceRegistry(): ServiceRegistry {
  if (!globalRegistry) {
    globalRegistry = new ServiceRegistry();
  }
  return globalRegistry;
}

/**
 * Create a new service registry
 */
export function createServiceRegistry(): ServiceRegistry {
  return new ServiceRegistry();
}
