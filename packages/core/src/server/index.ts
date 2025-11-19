/**
 * NodeCG Next - Core Server Implementation
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { NodeCGConfig, NodeCGServer, Logger } from '@nodecg/types';
import { createLogger } from '../utils/logger';
import { registerMiddleware } from './middleware';
import { registerRoutes } from './routes';
import { setupWebSocket, closeWebSocket } from './websocket';
import { getEventBus, Events } from '../utils/event-bus';
import { BundleManager } from '../services/bundle';
import { ServiceRegistry } from '../services/base.service';

export class NodeCGServerImpl implements NodeCGServer {
  private fastify: FastifyInstance;
  private config: NodeCGConfig;
  private logger: Logger;
  private started: boolean = false;
  private eventBus = getEventBus();
  private serviceRegistry: ServiceRegistry;
  private bundleManager: BundleManager;

  constructor(config: NodeCGConfig) {
    this.config = config;
    this.logger = createLogger(config.logging);

    // Initialize Fastify
    this.fastify = Fastify({
      logger: {
        level: config.logging?.level || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
      trustProxy: true,
      disableRequestLogging: false,
    });

    // Initialize service registry
    this.serviceRegistry = new ServiceRegistry(this.logger);

    // Initialize Bundle Manager
    this.bundleManager = new BundleManager({
      bundlesDir: config.bundles?.dir, // Let constructor handle default
      enableHotReload: config.bundles?.hotReload !== false,
      logger: this.logger,
      config: this.config,
    });

    // Register Bundle Manager in service registry
    this.serviceRegistry.register(this.bundleManager);

    // Make bundle manager available to routes via fastify decorator
    this.fastify.decorate('bundleManager', this.bundleManager);
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server is already started');
    }

    try {
      this.logger.info('Starting NodeCG Next server...');

      // Initialize services first
      this.logger.info('Initializing services...');
      await this.serviceRegistry.initializeAll();

      // Register plugins and middleware
      await this.registerPlugins();
      await registerMiddleware(this.fastify, this.config);
      await registerRoutes(this.fastify, this.config);

      // Start listening
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      // Setup WebSocket after HTTP server is ready
      await setupWebSocket(this.fastify, this.config);

      this.started = true;

      const stats = this.bundleManager.getStatistics();
      this.logger.info(
        `NodeCG Next server started on http://${this.config.host}:${this.config.port}`
      );
      this.logger.info(`Loaded ${stats.loaded} bundle(s)`);

      // Emit server started event
      this.eventBus.emit(Events.SERVER_STARTED, {
        host: this.config.host,
        port: this.config.port,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      this.eventBus.emit(Events.SERVER_ERROR, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) {
      throw new Error('Server is not started');
    }

    try {
      this.logger.info('Stopping NodeCG Next server...');

      // Emit shutdown event
      this.eventBus.emit(Events.SYSTEM_SHUTDOWN, {
        timestamp: new Date().toISOString(),
      });

      // Shutdown services first
      this.logger.info('Shutting down services...');
      await this.serviceRegistry.shutdownAll();

      // Close WebSocket connections
      await closeWebSocket();

      // Then close Fastify server
      await this.fastify.close();
      this.started = false;
      this.logger.info('NodeCG Next server stopped');

      // Emit server stopped event
      this.eventBus.emit(Events.SERVER_STOPPED, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to stop server:', error);
      this.eventBus.emit(Events.SERVER_ERROR, error);
      throw error;
    }
  }

  getConfig(): NodeCGConfig {
    return this.config;
  }

  getFastify(): FastifyInstance {
    return this.fastify;
  }

  getBundleManager(): BundleManager {
    return this.bundleManager;
  }

  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, {
      origin: this.config.cors?.origin ?? true,
      credentials: this.config.cors?.credentials ?? true,
    });

    // Security headers
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false, // TODO: Configure properly
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    this.logger.debug('Fastify plugins registered');
  }
}

export { FastifyInstance };
