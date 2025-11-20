/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../../../services/auth/utils/jwt.js';
import type { SessionRepository } from '../../../database/repositories/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger({ level: 'info' });

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      username: string;
      roleId?: string;
    };
  }
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(sessionRepository: SessionRepository) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'No authorization header provided',
        });
      }

      // Extract token (format: "Bearer <token>")
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid authorization header format. Expected: Bearer <token>',
        });
      }

      // Verify JWT token
      const payload = verifyToken(token);
      if (!payload) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }

      // Check if session exists and is active
      const session = await sessionRepository.findActiveSessionByToken(token);
      if (!session) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Session not found or expired',
        });
      }

      // Attach user info to request
      request.user = {
        userId: payload.userId,
        username: payload.username,
        roleId: payload.roleId,
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function createOptionalAuthMiddleware(sessionRepository: SessionRepository) {
  return async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply) {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return; // No token, continue without auth
      }

      // Extract token
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        return; // Invalid format, continue without auth
      }

      // Verify JWT token
      const payload = verifyToken(token);
      if (!payload) {
        return; // Invalid token, continue without auth
      }

      // Check session
      const session = await sessionRepository.findActiveSessionByToken(token);
      if (!session) {
        return; // Session not found, continue without auth
      }

      // Attach user info to request
      request.user = {
        userId: payload.userId,
        username: payload.username,
        roleId: payload.roleId,
      };
    } catch (error) {
      logger.debug('Optional authentication failed:', error);
      // Continue without auth
    }
  };
}
