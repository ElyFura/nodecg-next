/**
 * Replicant API Routes
 * REST endpoints for managing replicants
 */

import { FastifyInstance } from 'fastify';
import { getReplicantService } from '../../../../server/websocket';
import { authenticateToken, AuthenticatedRequest, requireOperator } from '../../middleware/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger({ level: 'info' });

export async function replicantRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all replicants (admin only)
  fastify.get(
    '/',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (_request, reply) => {
      try {
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const replicants = await service.getAll();
        reply.send({ replicants });
      } catch (error) {
        logger.error('Failed to get all replicants:', error);
        reply.code(500).send({ error: 'Failed to get replicants' });
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
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const { namespace } = request.params;
        const replicants = await service.getByNamespace(namespace);
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
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const { namespace, name } = request.params;
        const value = await service.get(namespace, name);

        if (value === null) {
          reply.code(404).send({ error: 'Replicant not found' });
          return;
        }

        reply.send({ namespace, name, value });
      } catch (error) {
        logger.error('Failed to get replicant:', error);
        reply.code(500).send({ error: 'Failed to get replicant' });
      }
    }
  );

  // Update replicant value
  fastify.put<{
    Params: { namespace: string; name: string };
    Body: { value: any };
  }>(
    '/:namespace/:name',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (
      request: AuthenticatedRequest & {
        params: { namespace: string; name: string };
        body: { value: any };
      },
      reply
    ) => {
      try {
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const { namespace, name } = request.params;
        const { value } = request.body;

        // Attempt to set the value (validation happens in service)
        const success = await service.set(namespace, name, value, request.user?.username);

        if (success) {
          const updatedValue = await service.get(namespace, name);
          reply.send({ namespace, name, value: updatedValue });
        } else {
          reply.code(500).send({ error: 'Failed to update replicant' });
        }
      } catch (error) {
        logger.error('Failed to update replicant:', error);
        reply.code(400).send({
          error: error instanceof Error ? error.message : 'Failed to update replicant',
        });
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
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const { namespace, name } = request.params;
        const limit = parseInt(request.query.limit || '50', 10);

        const history = await service.getHistory(namespace, name, limit);

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
        const service = getReplicantService();
        if (!service) {
          reply.code(503).send({ error: 'Replicant service not available' });
          return;
        }

        const { namespace, name } = request.params;
        await service.delete(namespace, name);
        reply.send({ success: true });
      } catch (error) {
        logger.error('Failed to delete replicant:', error);
        reply.code(500).send({ error: 'Failed to delete replicant' });
      }
    }
  );
}
