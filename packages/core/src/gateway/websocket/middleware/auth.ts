/**
 * WebSocket Authentication Middleware
 * Handles token verification for Socket.IO connections
 * SQL-only, works completely offline with local database
 */

import { Socket } from 'socket.io';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

// ExtendedError type for Socket.IO
interface ExtendedError extends Error {
  data?: Record<string, unknown>;
}

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Socket.IO authentication middleware
 * Verifies token from handshake auth or query parameters
 */
export function socketAuth(socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token || typeof token !== 'string') {
    const error = new Error('Authentication token required') as ExtendedError;
    error.data = { code: 'NO_TOKEN' };
    return next(error);
  }

  // Verify token with session repository
  const repos = getRepositories(logger);

  repos.user
    .findActiveSessionByToken(token)
    .then((session) => {
      if (!session || !session.user) {
        const error = new Error('Invalid or expired token') as ExtendedError;
        error.data = { code: 'INVALID_TOKEN' };
        return next(error);
      }

      // Attach user to socket
      socket.user = {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
      };

      logger.info(`WebSocket authenticated: ${session.user.username} (${socket.id})`);
      next();
    })
    .catch((error) => {
      logger.error('WebSocket authentication error:', error);
      const err = new Error('Authentication failed') as ExtendedError;
      err.data = { code: 'AUTH_ERROR' };
      next(err);
    });
}

/**
 * Optional WebSocket authentication
 * Attaches user if token provided, but allows connection without auth
 */
export function socketOptionalAuth(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token || typeof token !== 'string') {
    // No token, continue without auth
    logger.debug(`WebSocket connected without authentication (${socket.id})`);
    return next();
  }

  // Try to verify token
  const repos = getRepositories(logger);

  repos.user
    .findActiveSessionByToken(token)
    .then((session) => {
      if (session?.user) {
        socket.user = {
          id: session.user.id,
          username: session.user.username,
          role: session.user.role,
        };
        logger.info(`WebSocket authenticated (optional): ${session.user.username} (${socket.id})`);
      }
      next();
    })
    .catch((error) => {
      logger.warn('Optional WebSocket auth failed, continuing without user:', error);
      next();
    });
}

/**
 * Check if socket user has required role
 */
export function socketHasRole(socket: AuthenticatedSocket, ...roles: string[]): boolean {
  if (!socket.user) {
    return false;
  }
  return roles.includes(socket.user.role);
}

/**
 * Require specific role for socket event handler
 */
export function socketRequireRole(
  socket: AuthenticatedSocket,
  roles: string[],
  callback: (error?: { message: string; code: string }) => void
): boolean {
  if (!socket.user) {
    callback({ message: 'Authentication required', code: 'UNAUTHORIZED' });
    return false;
  }

  if (!roles.includes(socket.user.role)) {
    callback({
      message: `Required role: ${roles.join(' or ')}`,
      code: 'FORBIDDEN',
    });
    return false;
  }

  return true;
}

/**
 * Get user from socket or null
 */
export function getSocketUser(
  socket: AuthenticatedSocket
): { id: string; username: string; role: string } | null {
  return socket.user || null;
}

/**
 * Check if socket is admin
 */
export function socketIsAdmin(socket: AuthenticatedSocket): boolean {
  return socketHasRole(socket, 'ADMIN');
}

/**
 * Check if socket is operator or admin
 */
export function socketIsOperator(socket: AuthenticatedSocket): boolean {
  return socketHasRole(socket, 'OPERATOR', 'ADMIN');
}

/**
 * Check if socket is any authenticated user
 */
export function socketIsAuthenticated(socket: AuthenticatedSocket): boolean {
  return socket.user !== undefined;
}
