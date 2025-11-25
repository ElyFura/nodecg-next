/**
 * Dashboard WebSocket Namespace
 * Handles real-time communication for the NodeCG dashboard
 */

import { Namespace } from 'socket.io';
import { AuthenticatedSocket, socketIsOperator, socketRequireRole } from '../middleware/auth';
import { RoomManager } from '../rooms';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface DashboardEvents {
  // Replicant events
  'replicant:subscribe': (data: { namespace: string; name: string }) => void;
  'replicant:unsubscribe': (data: { namespace: string; name: string }) => void;
  'replicant:update': (data: { namespace: string; name: string; value: string }) => void;

  // Bundle events
  'bundle:enable': (data: { name: string }) => void;
  'bundle:disable': (data: { name: string }) => void;
  'bundle:reload': (data: { name: string }) => void;

  // System events
  'system:status': () => void;
  'system:logs': (data: { level?: string; limit?: number }) => void;

  // User events
  'user:presence': () => void;
}

/**
 * Setup dashboard namespace handlers
 */
export function setupDashboardNamespace(namespace: Namespace, roomManager: RoomManager): void {
  const repos = getRepositories(logger);

  namespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Dashboard connected: ${socket.user?.username || 'anonymous'} (${socket.id})`);

    // Join dashboard room
    roomManager.joinRoom(socket, 'dashboard').catch((error) => {
      logger.error('Failed to join dashboard room:', error);
    });

    // Send current user info
    socket.emit('user:connected', {
      user: socket.user || null,
      socketId: socket.id,
    });

    // ===== REPLICANT EVENTS =====

    /**
     * Subscribe to replicant updates
     */
    socket.on('replicant:subscribe', async (data: { namespace: string; name: string }) => {
      try {
        const { namespace: ns, name } = data;
        const roomName = `replicant:${ns}:${name}`;

        // Join replicant-specific room
        await roomManager.joinRoom(socket, roomName);

        // Send current value
        const replicant = await repos.replicant.findByNamespaceAndName(ns, name);

        if (replicant) {
          socket.emit('replicant:value', {
            namespace: ns,
            name,
            value: replicant.value,
            revision: replicant.revision,
          });
        } else {
          socket.emit('replicant:notFound', { namespace: ns, name });
        }
      } catch (error) {
        logger.error('Error subscribing to replicant:', error);
        socket.emit('replicant:error', {
          message: 'Failed to subscribe to replicant',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Unsubscribe from replicant updates
     */
    socket.on('replicant:unsubscribe', async (data: { namespace: string; name: string }) => {
      try {
        const { namespace: ns, name } = data;
        const roomName = `replicant:${ns}:${name}`;
        await roomManager.leaveRoom(socket, roomName);
      } catch (error) {
        logger.error('Error unsubscribing from replicant:', error);
      }
    });

    /**
     * Update replicant value
     * Note: Permission checks disabled for development/example bundles
     * TODO: Re-enable role checks for production
     */
    socket.on(
      'replicant:update',
      async (data: { namespace: string; name: string; value: string }) => {
        // Temporarily allow updates without role check for development
        // if (
        //   !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
        //     socket.emit('replicant:error', error);
        //   })
        // ) {
        //   return;
        // }

        try {
          const { namespace: ns, name, value } = data;

          // Validate JSON
          try {
            JSON.parse(value);
          } catch {
            socket.emit('replicant:error', {
              message: 'Invalid JSON value',
              code: 'INVALID_JSON',
            });
            return;
          }

          // Update replicant
          const replicant = await repos.replicant.updateByNamespaceAndName(
            ns,
            name,
            value,
            socket.user?.username
          );

          // Broadcast update to all subscribers
          const roomName = `replicant:${ns}:${name}`;
          roomManager.broadcastToRoom(roomName, 'replicant:updated', {
            namespace: ns,
            name,
            value: replicant.value,
            revision: replicant.revision,
            updatedBy: socket.user?.username,
          });

          // Acknowledge to sender
          socket.emit('replicant:updateSuccess', {
            namespace: ns,
            name,
            revision: replicant.revision,
          });
        } catch (error) {
          logger.error('Error updating replicant:', error);
          socket.emit('replicant:error', {
            message: 'Failed to update replicant',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // ===== BUNDLE EVENTS =====

    /**
     * Enable a bundle (requires operator role)
     */
    socket.on('bundle:enable', async (data: { name: string }) => {
      if (
        !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
          socket.emit('bundle:error', error);
        })
      ) {
        return;
      }

      try {
        const bundle = await repos.bundle.enableByName(data.name);

        // Broadcast to all dashboard users
        roomManager.broadcastToRoom('dashboard', 'bundle:enabled', {
          name: bundle.name,
          enabledBy: socket.user?.username,
        });

        socket.emit('bundle:enableSuccess', { name: bundle.name });
      } catch (error) {
        logger.error('Error enabling bundle:', error);
        socket.emit('bundle:error', {
          message: 'Failed to enable bundle',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Disable a bundle (requires operator role)
     */
    socket.on('bundle:disable', async (data: { name: string }) => {
      if (
        !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
          socket.emit('bundle:error', error);
        })
      ) {
        return;
      }

      try {
        const bundle = await repos.bundle.disableByName(data.name);

        // Broadcast to all dashboard users
        roomManager.broadcastToRoom('dashboard', 'bundle:disabled', {
          name: bundle.name,
          disabledBy: socket.user?.username,
        });

        socket.emit('bundle:disableSuccess', { name: bundle.name });
      } catch (error) {
        logger.error('Error disabling bundle:', error);
        socket.emit('bundle:error', {
          message: 'Failed to disable bundle',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Reload a bundle (requires operator role)
     */
    socket.on('bundle:reload', async (data: { name: string }) => {
      if (
        !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
          socket.emit('bundle:error', error);
        })
      ) {
        return;
      }

      try {
        // TODO: Implement bundle reload logic when bundle manager is ready
        logger.info(`Bundle reload requested: ${data.name} by ${socket.user?.username}`);

        socket.emit('bundle:reloadSuccess', {
          name: data.name,
          message: 'Bundle reload not yet implemented',
        });
      } catch (error) {
        logger.error('Error reloading bundle:', error);
        socket.emit('bundle:error', {
          message: 'Failed to reload bundle',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ===== SYSTEM EVENTS =====

    /**
     * Get system status
     */
    socket.on('system:status', async () => {
      try {
        const bundleStats = await repos.bundle.getStatistics();
        const roomStats = roomManager.getStatistics();

        socket.emit('system:status', {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          bundles: bundleStats,
          connections: roomStats,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error getting system status:', error);
        socket.emit('system:error', {
          message: 'Failed to get system status',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Get system logs (requires operator role)
     */
    socket.on('system:logs', async (_data: { level?: string; limit?: number }) => {
      if (!socketIsOperator(socket)) {
        socket.emit('system:error', {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        });
        return;
      }

      try {
        // TODO: Implement log retrieval when logging system is ready
        logger.info(`Logs requested by ${socket.user?.username}`);

        socket.emit('system:logs', {
          logs: [],
          message: 'Log retrieval not yet implemented',
        });
      } catch (error) {
        logger.error('Error getting logs:', error);
        socket.emit('system:error', {
          message: 'Failed to get logs',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ===== USER PRESENCE =====

    /**
     * Get current users in dashboard
     */
    socket.on('user:presence', () => {
      const members = roomManager.getAuthenticatedMembers('dashboard');
      socket.emit('user:presence', {
        users: members.map((m) => ({
          username: m.username,
          socketId: m.socketId,
          joinedAt: m.joinedAt,
        })),
      });
    });

    // ===== DISCONNECTION =====

    socket.on('disconnect', async () => {
      logger.info(`Dashboard disconnected: ${socket.user?.username || 'anonymous'} (${socket.id})`);

      // Leave all rooms
      await roomManager.leaveAllRooms(socket);

      // Cleanup tracking
      roomManager.cleanupSocket(socket.id);
    });
  });

  logger.info('Dashboard namespace initialized');
}
