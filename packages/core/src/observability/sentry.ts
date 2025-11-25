/**
 * Sentry Error Tracking Integration
 * Captures and reports errors to Sentry for monitoring
 */

import * as Sentry from '@sentry/node';
import { Logger } from '@nodecg/types';
import { FastifyInstance } from 'fastify';

export interface SentryConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
}

export class SentryService {
  private config: SentryConfig;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(config: SentryConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  initialize(): void {
    if (!this.config.enabled) {
      this.logger.info('Sentry error tracking is disabled');
      return;
    }

    if (!this.config.dsn) {
      this.logger.warn('Sentry DSN not configured, skipping initialization');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.tracesSampleRate ?? 0.1,
        profilesSampleRate: this.config.profilesSampleRate ?? 0.1,
        debug: this.config.debug ?? false,
        beforeSend(event, hint) {
          // Filter out health check errors
          const error = hint.originalException;
          if (error instanceof Error) {
            if (error.message?.includes('health') || error.message?.includes('metrics')) {
              return null;
            }
          }
          return event;
        },
      });

      this.initialized = true;
      this.logger.info('Sentry error tracking initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Setup Sentry for Fastify
   */
  setupFastify(fastify: FastifyInstance): void {
    if (!this.initialized) return;

    // Add Sentry request handler
    fastify.addHook('onRequest', async (request) => {
      Sentry.setContext('request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
      });
    });

    // Add Sentry error handler
    fastify.addHook('onError', async (request, reply, error) => {
      Sentry.captureException(error, {
        tags: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
        },
      });
    });

    this.logger.debug('Sentry Fastify integration configured');
  }

  /**
   * Capture an exception manually
   */
  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) return;

    Sentry.captureMessage(message, level);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; username?: string; email?: string }): void {
    if (!this.initialized) return;

    Sentry.setUser(user);
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.setContext(key, context);
  }

  /**
   * Flush pending events
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    try {
      await Sentry.flush(timeout);
      return true;
    } catch (error) {
      this.logger.error('Failed to flush Sentry events:', error);
      return false;
    }
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<void> {
    if (!this.initialized) return;

    try {
      await Sentry.close(timeout);
      this.logger.info('Sentry client closed');
    } catch (error) {
      this.logger.error('Error closing Sentry client:', error);
    }
  }
}
