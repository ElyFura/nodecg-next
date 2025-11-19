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

export class NodeCGServerImpl implements NodeCGServer {
  private fastify: FastifyInstance;
  private config: NodeCGConfig;
  private logger: Logger;
  private started: boolean = false;

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
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server is already started');
    }

    try {
      this.logger.info('Starting NodeCG Next server...');

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
      this.logger.info(
        `NodeCG Next server started on http://${this.config.host}:${this.config.port}`
      );
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) {
      throw new Error('Server is not started');
    }

    try {
      this.logger.info('Stopping NodeCG Next server...');

      // Close WebSocket connections first
      await closeWebSocket();

      // Then close Fastify server
      await this.fastify.close();
      this.started = false;
      this.logger.info('NodeCG Next server stopped');
    } catch (error) {
      this.logger.error('Failed to stop server:', error);
      throw error;
    }
  }

  getConfig(): NodeCGConfig {
    return this.config;
  }

  getFastify(): FastifyInstance {
    return this.fastify;
  }

  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, {
      origin: true, // TODO: Configure based on config
      credentials: true,
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
