/**
 * Request Validation Middleware
 * Validates request body, query params, and params using Zod schemas
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';
import { validate, formatValidationErrors, isValidationError } from '../../utils/validation';

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Create a validation middleware for request validation
 */
export function validateRequest(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Validate body
      if (schemas.body) {
        request.body = validate(schemas.body, request.body);
      }

      // Validate query parameters
      if (schemas.query) {
        request.query = validate(schemas.query, request.query);
      }

      // Validate route parameters
      if (schemas.params) {
        request.params = validate(schemas.params, request.params);
      }

      // Validate headers
      if (schemas.headers) {
        request.headers = validate(schemas.headers, request.headers);
      }
    } catch (error) {
      if (isValidationError(error)) {
        reply.code(400).send({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: formatValidationErrors(error),
        });
        return;
      }

      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Unexpected error during validation',
      });
    }
  };
}

/**
 * Validate request body only
 */
export function validateBody(schema: ZodSchema) {
  return validateRequest({ body: schema });
}

/**
 * Validate request query parameters only
 */
export function validateQuery(schema: ZodSchema) {
  return validateRequest({ query: schema });
}

/**
 * Validate request params only
 */
export function validateParams(schema: ZodSchema) {
  return validateRequest({ params: schema });
}
