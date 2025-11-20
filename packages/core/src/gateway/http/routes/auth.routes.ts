/**
 * Authentication Routes
 * Handles user registration, login, logout, and token management
 */

import type { FastifyInstance } from 'fastify';
import type { AuthService, AuditService } from '../../../services/auth/index.js';
import { createOptionalAuthMiddleware } from '../middleware/authenticate.js';
import type { SessionRepository } from '../../../database/repositories/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger({ level: 'info' });

export interface AuthRoutesOptions {
  authService: AuthService;
  auditService: AuditService;
  sessionRepository: SessionRepository;
}

/**
 * Register authentication routes
 */
export async function registerAuthRoutes(
  fastify: FastifyInstance,
  { authService, auditService, sessionRepository }: AuthRoutesOptions,
) {
  const optionalAuth = createOptionalAuthMiddleware(sessionRepository);

  /**
   * POST /auth/register
   * Register a new user
   */
  fastify.post<{
    Body: {
      username: string;
      email?: string;
      password: string;
    };
  }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 32,
              pattern: '^[a-zA-Z0-9_-]+$',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              minLength: 8,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: ['string', 'null'] },
                  roleId: { type: ['string', 'null'] },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { username, email, password } = request.body;
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        const result = await authService.register(
          { username, email, password },
          ipAddress,
          userAgent,
        );

        await auditService.logAuth('register', result.user.id, ipAddress, userAgent);

        logger.info(`User registered: ${username}`);

        return reply.code(200).send(result);
      } catch (error) {
        logger.error('Registration error:', error);

        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            return reply.code(409).send({
              error: 'Conflict',
              message: error.message,
            });
          }
        }

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Registration failed',
        });
      }
    },
  );

  /**
   * POST /auth/login
   * Login with username and password
   */
  fastify.post<{
    Body: {
      username: string;
      password: string;
    };
  }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: ['string', 'null'] },
                  roleId: { type: ['string', 'null'] },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { username, password } = request.body;
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        const result = await authService.login({ username, password }, ipAddress, userAgent);

        await auditService.logAuth('login', result.user.id, ipAddress, userAgent);

        logger.info(`User logged in: ${username}`);

        return reply.code(200).send(result);
      } catch (error) {
        logger.error('Login error:', error);

        if (error instanceof Error) {
          if (
            error.message.includes('Invalid username or password') ||
            error.message.includes('OAuth')
          ) {
            return reply.code(401).send({
              error: 'Unauthorized',
              message: error.message,
            });
          }
        }

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Login failed',
        });
      }
    },
  );

  /**
   * POST /auth/logout
   * Logout and invalidate session
   */
  fastify.post(
    '/auth/logout',
    {
      preHandler: [optionalAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader) {
          const [, token] = authHeader.split(' ');
          if (token) {
            await authService.logout(token);

            if (request.user) {
              await auditService.logAuth('logout', request.user.userId);
            }
          }
        }

        return reply.code(200).send({
          message: 'Logged out successfully',
        });
      } catch (error) {
        logger.error('Logout error:', error);

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Logout failed',
        });
      }
    },
  );

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post<{
    Body: {
      refreshToken: string;
    };
  }>(
    '/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        const result = await authService.refreshToken(refreshToken);

        return reply.code(200).send(result);
      } catch (error) {
        logger.error('Token refresh error:', error);

        if (error instanceof Error && error.message.includes('Invalid')) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid refresh token',
          });
        }

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Token refresh failed',
        });
      }
    },
  );

  /**
   * GET /auth/me
   * Get current user info
   */
  fastify.get(
    '/auth/me',
    {
      preHandler: [optionalAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              username: { type: 'string' },
              roleId: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      return reply.code(200).send({
        userId: request.user.userId,
        username: request.user.username,
        roleId: request.user.roleId || null,
      });
    },
  );

  /**
   * POST /auth/change-password
   * Change user password
   */
  fastify.post<{
    Body: {
      oldPassword: string;
      newPassword: string;
    };
  }>(
    '/auth/change-password',
    {
      preHandler: [optionalAuth],
      schema: {
        body: {
          type: 'object',
          required: ['oldPassword', 'newPassword'],
          properties: {
            oldPassword: { type: 'string' },
            newPassword: {
              type: 'string',
              minLength: 8,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      try {
        const { oldPassword, newPassword } = request.body;

        await authService.changePassword(request.user.userId, oldPassword, newPassword);

        await auditService.logAuth('password-change', request.user.userId);

        return reply.code(200).send({
          message: 'Password changed successfully',
        });
      } catch (error) {
        logger.error('Password change error:', error);

        if (error instanceof Error) {
          if (error.message.includes('incorrect') || error.message.includes('OAuth')) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Password change failed',
        });
      }
    },
  );

  logger.info('Authentication routes registered');
}
