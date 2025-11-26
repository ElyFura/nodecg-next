/**
 * NodeCG Next - Core Server Implementation
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { NodeCGConfig, NodeCGServer, Logger } from '@nodecg/types';
import type { Logger as PinoLogger } from 'pino';
import { createLogger } from '../utils/logger';
import { registerMiddleware } from './middleware';
import { registerRoutes } from './routes';
import { setupWebSocket, closeWebSocket } from './websocket';
import { getEventBus, Events } from '../utils/event-bus';
import { BundleManager } from '../services/bundle';
import { ServiceRegistry } from '../services/base.service';
import { initializeDatabase, seedDefaultRoles } from '../database/init';
import { PluginManagerService } from '../services/plugin';
import { getPrismaClient } from '../database/client';
import {
  TelemetryService,
  MetricsService,
  SentryService,
  PerformanceMonitor,
} from '../observability';

export class NodeCGServerImpl implements NodeCGServer {
  private fastify: FastifyInstance;
  private config: NodeCGConfig;
  private logger: Logger;
  private started: boolean = false;
  private eventBus = getEventBus();
  private serviceRegistry: ServiceRegistry;
  private bundleManager: BundleManager;
  private pluginManager: PluginManagerService;
  private telemetryService: TelemetryService;
  private metricsService: MetricsService;
  private sentryService: SentryService;
  private performanceMonitor: PerformanceMonitor;

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

    // Initialize Plugin Manager
    this.pluginManager = new PluginManagerService({
      logger: this.fastify.log as PinoLogger, // Use Fastify's pino logger
      eventBus: this.eventBus,
      config: this.config,
    });

    // Make services available to routes via fastify decorators
    this.fastify.decorate('bundleManager', this.bundleManager);
    this.fastify.decorate('pluginManager', this.pluginManager);

    // Decorate with prisma (will be available immediately)
    this.fastify.decorate('prisma', getPrismaClient(this.logger));

    // Decorate with replicantService placeholder (will be set in setupWebSocket)
    this.fastify.decorate('replicantService', null);

    // Initialize Observability Services
    this.telemetryService = new TelemetryService(
      {
        enabled: config.observability?.telemetry?.enabled ?? true,
        serviceName: 'nodecg-next',
        serviceVersion: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        prometheusPort: config.observability?.telemetry?.prometheusPort ?? 9464,
        otlpEndpoint: config.observability?.telemetry?.otlpEndpoint,
        sampleRate: config.observability?.telemetry?.sampleRate ?? 0.1,
      },
      this.logger
    );

    this.metricsService = new MetricsService(this.logger);

    this.sentryService = new SentryService(
      {
        enabled: config.observability?.sentry?.enabled ?? false,
        dsn: config.observability?.sentry?.dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '0.1.0',
        tracesSampleRate: config.observability?.sentry?.tracesSampleRate ?? 0.1,
        profilesSampleRate: config.observability?.sentry?.profilesSampleRate ?? 0.1,
        debug: config.observability?.sentry?.debug ?? false,
      },
      this.logger
    );

    this.performanceMonitor = new PerformanceMonitor(this.logger);

    // Decorate with observability services
    this.fastify.decorate('metricsService', this.metricsService);
    this.fastify.decorate('performanceMonitor', this.performanceMonitor);
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server is already started');
    }

    try {
      this.logger.info('Starting NodeCG Next server...');

      // Initialize observability services first
      this.logger.info('Initializing observability...');
      await this.telemetryService.initialize();
      this.sentryService.initialize();
      this.sentryService.setupFastify(this.fastify);

      // Initialize database first (create /db directory and schema)
      this.logger.info('Initializing database...');
      await initializeDatabase(this.logger);

      // Seed default roles and permissions if needed
      await seedDefaultRoles(this.logger);

      // Initialize services
      this.logger.info('Initializing services...');
      await this.serviceRegistry.initializeAll();

      // Discover and start plugins
      this.logger.info('Discovering plugins...');
      await this.pluginManager.discoverPlugins();
      await this.pluginManager.startAll();

      // Register plugins and middleware
      await this.registerPlugins();
      await this.setupMetricsEndpoint();
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
      this.sentryService.captureException(error as Error);
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

      // Stop plugins first
      this.logger.info('Stopping plugins...');
      await this.pluginManager.stopAll();

      // Shutdown services
      this.logger.info('Shutting down services...');
      await this.serviceRegistry.shutdownAll();

      // Close WebSocket connections
      await closeWebSocket();

      // Then close Fastify server
      await this.fastify.close();

      // Shutdown observability services
      this.logger.info('Shutting down observability...');
      await this.telemetryService.shutdown();
      await this.sentryService.flush();
      await this.sentryService.close();

      this.started = false;
      this.logger.info('NodeCG Next server stopped');

      // Emit server stopped event
      this.eventBus.emit(Events.SERVER_STOPPED, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to stop server:', error);
      this.eventBus.emit(Events.SERVER_ERROR, error);
      this.sentryService.captureException(error as Error);
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

  getPluginManager(): PluginManagerService {
    return this.pluginManager;
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

  private async setupMetricsEndpoint(): Promise<void> {
    // Prometheus metrics endpoint
    this.fastify.get('/metrics', async (_request, reply) => {
      reply.header('Content-Type', this.metricsService.getRegister().contentType);
      return await this.metricsService.getMetrics();
    });

    // Performance report endpoint
    this.fastify.get('/metrics/performance', async () => {
      return this.performanceMonitor.getReport();
    });

    this.logger.debug('Metrics endpoints configured');
  }
}

export { FastifyInstance };
