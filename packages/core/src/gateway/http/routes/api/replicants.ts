/**
 * Replicant API Routes
 * REST endpoints for managing replicants
 */

import { FastifyInstance } from 'fastify';
import { getRepositories } from '../../../../database/client';
import { authenticateToken, AuthenticatedRequest, requireOperator } from '../../middleware/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger({ level: 'info' });

export async function replicantRoutes(fastify: FastifyInstance): Promise<void> {
  const repos = getRepositories(logger);

  // Get all namespaces
  fastify.get(
    '/namespaces',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const namespaces = await repos.replicant.getNamespaces();
        reply.send({ namespaces });
      } catch (error) {
        logger.error('Failed to get namespaces:', error);
        reply.code(500).send({ error: 'Failed to get namespaces' });
      }
    }
  );

  // Get all replicants for a namespace
  fastify.get<{ Params: { namespace: string } }>(
    '/:namespace',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace } = request.params;
        const replicants = await repos.replicant.findByNamespace(namespace);
        reply.send({ replicants });
      } catch (error) {
        logger.error('Failed to get replicants:', error);
        reply.code(500).send({ error: 'Failed to get replicants' });
      }
    }
  );

  // Get specific replicant
  fastify.get<{ Params: { namespace: string; name: string } }>(
    '/:namespace/:name',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace, name } = request.params;
        const replicant = await repos.replicant.findByNamespaceAndName(namespace, name);

        if (!replicant) {
          reply.code(404).send({ error: 'Replicant not found' });
          return;
        }

        reply.send({ replicant });
      } catch (error) {
        logger.error('Failed to get replicant:', error);
        reply.code(500).send({ error: 'Failed to get replicant' });
      }
    }
  );

  // Update replicant value
  fastify.put<{
    Params: { namespace: string; name: string };
    Body: { value: string };
  }>(
    '/:namespace/:name',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (
      request: AuthenticatedRequest & {
        params: { namespace: string; name: string };
        body: { value: string };
      },
      reply
    ) => {
      try {
        const { namespace, name } = request.params;
        const { value } = request.body;

        // Validate JSON
        try {
          JSON.parse(value);
        } catch {
          reply.code(400).send({ error: 'Invalid JSON value' });
          return;
        }

        const replicant = await repos.replicant.updateByNamespaceAndName(
          namespace,
          name,
          value,
          request.user?.username
        );

        reply.send({ replicant });
      } catch (error) {
        logger.error('Failed to update replicant:', error);
        reply.code(500).send({ error: 'Failed to update replicant' });
      }
    }
  );

  // Get replicant history
  fastify.get<{
    Params: { namespace: string; name: string };
    Querystring: { limit?: string };
  }>(
    '/:namespace/:name/history',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace, name } = request.params;
        const limit = parseInt(request.query.limit || '50', 10);

        const history = await repos.replicant.getHistoryByNamespaceAndName(namespace, name, limit);

        reply.send({ history });
      } catch (error) {
        logger.error('Failed to get replicant history:', error);
        reply.code(500).send({ error: 'Failed to get replicant history' });
      }
    }
  );

  // Delete replicant
  fastify.delete<{ Params: { namespace: string; name: string } }>(
    '/:namespace/:name',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const { namespace, name } = request.params;
        await repos.replicant.deleteByNamespaceAndName(namespace, name);
        reply.send({ success: true });
      } catch (error) {
        logger.error('Failed to delete replicant:', error);
        reply.code(500).send({ error: 'Failed to delete replicant' });
      }
    }
  );
}
