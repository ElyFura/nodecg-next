/**
 * Middleware registration for Fastify
 */

import { FastifyInstance, FastifyError } from 'fastify';
import { NodeCGConfig } from '@nodecg/types';

export async function registerMiddleware(
  fastify: FastifyInstance,
  _config: NodeCGConfig
): Promise<void> {
  // Error handler
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error);

    // Don't leak error details in production
    const isDev = process.env.NODE_ENV !== 'production';

    reply.status(error.statusCode || 500).send({
      error: {
        message: isDev ? error.message : 'Internal Server Error',
        statusCode: error.statusCode || 500,
        ...(isDev && { stack: error.stack }),
      },
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        message: 'Route not found',
        statusCode: 404,
        path: request.url,
      },
    });
  });

  fastify.log.info('Middleware registered');
}
