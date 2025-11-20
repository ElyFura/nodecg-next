/**
 * Route registration for Fastify
 */

import { FastifyInstance } from 'fastify';
import { NodeCGConfig } from '@nodecg/types';
import { healthRoutes } from './health';
import { apiRoutes } from '../../gateway/http/routes/api';
import { dashboardRoutes } from '../../gateway/http/routes/dashboard';
import { bundleContentRoutes } from '../../gateway/http/routes/bundle-content';
import { registerAuthRoutes } from '../../gateway/http/routes/auth.routes';
import { registerOAuthRoutes } from '../../gateway/http/routes/oauth.routes';
import { getRepositories } from '../../database/client';
import { AuthService } from '../../services/auth/auth.service';
import { OAuthService } from '../../services/auth/oauth.service';
import { AuditService } from '../../services/auth/audit.service';
import { getPrismaClient } from '../../database/client';

export async function registerRoutes(
  fastify: FastifyInstance,
  _config: NodeCGConfig
): Promise<void> {
  // Health check routes
  await fastify.register(healthRoutes);

  // Initialize auth services for auth routes
  const prisma = getPrismaClient(fastify.log);
  const repos = getRepositories(fastify.log);
  const auditService = new AuditService(prisma, fastify.log);

  const authService = new AuthService(repos.user, repos.role, repos.session, fastify.log);

  const oauthService = new OAuthService(
    repos.user,
    repos.oauthProvider,
    repos.session,
    fastify.log
  );

  // Register authentication routes
  await fastify.register(registerAuthRoutes, {
    authService,
    auditService,
    sessionRepository: repos.session,
  });

  // Register OAuth routes
  await fastify.register(registerOAuthRoutes, {
    oauthService,
    auditService,
    baseUrl: process.env.BASE_URL || `http://localhost:${_config.port}`,
  });

  // API routes
  await fastify.register(apiRoutes, { prefix: '/api' });

  // Bundle content routes (dashboard panels, graphics)
  await fastify.register(bundleContentRoutes);

  // Dashboard routes (must be last to not override other routes)
  await fastify.register(dashboardRoutes);

  fastify.log.info('Routes registered');
}
