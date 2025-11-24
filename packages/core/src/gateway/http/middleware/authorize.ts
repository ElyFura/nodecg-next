/**
 * Authorization Middleware
 * Checks user permissions using RBAC
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RBACService, PermissionCheck } from '../../../services/auth/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger({ level: 'info' });

/**
 * Create authorization middleware that requires specific permission
 */
export function createRequirePermission(
  rbacService: RBACService,
  resource: string,
  action: string
) {
  return async function requirePermission(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const hasPermission = await rbacService.hasPermission(request.user.userId, resource, action);

      if (!hasPermission) {
        logger.warn(
          `User ${request.user.username} (${request.user.userId}) attempted to access ${resource}:${action} without permission`
        );

        return reply.code(403).send({
          error: 'Forbidden',
          message: `You do not have permission to ${action} ${resource}`,
        });
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Create authorization middleware that requires any of the specified permissions
 */
export function createRequireAnyPermission(
  rbacService: RBACService,
  permissions: PermissionCheck[]
) {
  return async function requireAnyPermission(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const hasPermission = await rbacService.hasAnyPermission(request.user.userId, permissions);

      if (!hasPermission) {
        logger.warn(
          `User ${request.user.username} (${request.user.userId}) attempted to access resources without any required permissions`
        );

        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have the required permissions',
        });
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Create authorization middleware that requires all of the specified permissions
 */
export function createRequireAllPermissions(
  rbacService: RBACService,
  permissions: PermissionCheck[]
) {
  return async function requireAllPermissions(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const hasPermissions = await rbacService.hasAllPermissions(request.user.userId, permissions);

      if (!hasPermissions) {
        logger.warn(
          `User ${request.user.username} (${request.user.userId}) attempted to access resources without all required permissions`
        );

        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have all the required permissions',
        });
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Create authorization middleware that requires a specific role
 */
export function createRequireRole(rbacService: RBACService, roleName: string) {
  return async function requireRole(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const hasRole = await rbacService.hasRole(request.user.userId, roleName);

      if (!hasRole) {
        logger.warn(
          `User ${request.user.username} (${request.user.userId}) attempted to access resource requiring role: ${roleName}`
        );

        return reply.code(403).send({
          error: 'Forbidden',
          message: `You must be a ${roleName} to access this resource`,
        });
      }
    } catch (error) {
      logger.error('Authorization error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Create admin-only middleware
 */
export function createRequireAdmin(rbacService: RBACService) {
  return createRequireRole(rbacService, 'admin');
}
