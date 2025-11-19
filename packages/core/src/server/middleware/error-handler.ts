/**
 * Global Error Handler Middleware
 * Catches and formats all errors in a consistent way
 */

import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { formatErrorResponse, isNodeCGError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger({ level: 'error' });

/**
 * Global error handler
 * Should be registered as a Fastify error handler
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error
  logger.error('Request error:', {
    method: request.method,
    url: request.url,
    error: error.message,
    stack: error.stack,
  });

  // Format and send error response
  const errorResponse = formatErrorResponse(error);

  // Determine status code
  let statusCode = errorResponse.error.statusCode;

  // Handle Fastify-specific errors
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    statusCode = error.statusCode;
  }

  // Send response
  reply.code(statusCode).send(errorResponse);
}

/**
 * Not found handler (404)
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.code(404).send({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: request.url,
    },
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await handler(request, reply);
    } catch (error) {
      if (isNodeCGError(error)) {
        const response = formatErrorResponse(error);
        reply.code(error.statusCode).send(response);
      } else {
        throw error; // Let global error handler handle it
      }
    }
  };
}
