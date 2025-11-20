/**
 * Authentication Middleware
 * Handles JWT token verification for HTTP requests
 * SQL-only, works completely offline with local database
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    username: string;
    roleId?: string;
  };
}

/**
 * Verify JWT token and attach user to request
 * Uses session repository to validate token
 */
export async function authenticateToken(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token with session repository
    const repos = getRepositories(logger);
    const session = await repos.session.findActiveSessionByToken(token);

    if (!session || !session.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    request.user = {
      userId: session.user.id,
      username: session.user.username,
      roleId: session.user.roleId || undefined,
    };

    logger.debug(`Authenticated user: ${session.user.username}`);
  } catch (error) {
    logger.error('Authentication error:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to authenticate request',
    });
  }
}

/**
 * Verify user has required role (RBAC)
 * Must be used after authenticateToken
 */
export function requireRole(...roles: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!request.user.roleId) {
      reply.code(403).send({
        error: 'Forbidden',
        message: 'User has no assigned role',
      });
      return;
    }

    // Get user role from database
    const repos = getRepositories(logger);
    const role = await repos.role.findById(request.user.roleId);

    if (!role || !roles.includes(role.name)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    logger.debug(`User ${request.user.username} authorized with role ${role.name}`);
  };
}

/**
 * Optional authentication - attaches user if token provided, but doesn't reject
 */
export async function optionalAuth(
  request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return;
    }

    const repos = getRepositories(logger);
    const session = await repos.session.findActiveSessionByToken(token);

    if (session?.user) {
      request.user = {
        userId: session.user.id,
        username: session.user.username,
        roleId: session.user.roleId || undefined,
      };
    }
  } catch (error) {
    logger.warn('Optional auth failed, continuing without user:', error);
  }
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require operator or admin role
 */
export const requireOperator = requireRole('operator', 'admin');

/**
 * Require viewer, operator, or admin role (any authenticated user)
 */
export const requireViewer = requireRole('viewer', 'operator', 'admin');
