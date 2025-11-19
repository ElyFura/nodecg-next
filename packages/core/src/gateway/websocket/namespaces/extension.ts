/**
 * Extension WebSocket Namespace
 * Handles real-time communication for NodeCG extensions (server-side bundle code)
 */

import { Namespace } from 'socket.io';
import { AuthenticatedSocket, socketRequireRole } from '../middleware/auth';
import { RoomManager } from '../rooms';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface ExtensionEvents {
  // Replicant events (full read/write access)
  'replicant:subscribe': (data: { namespace: string; name: string }) => void;
  'replicant:unsubscribe': (data: { namespace: string; name: string }) => void;
  'replicant:update': (data: { namespace: string; name: string; value: string }) => void;
  'replicant:create': (data: {
    namespace: string;
    name: string;
    value: string;
    schema?: string;
  }) => void;
  'replicant:delete': (data: { namespace: string; name: string }) => void;

  // Asset events
  'asset:upload': (data: {
    namespace: string;
    name: string;
    file: Buffer;
    mimeType: string;
  }) => void;
  'asset:delete': (data: { namespace: string; name: string }) => void;

  // Inter-extension messaging
  'message:send': (data: { target: string; event: string; data: unknown }) => void;
  'message:broadcast': (data: { event: string; data: unknown }) => void;

  // Extension lifecycle
  'extension:ready': (data: { bundle: string; version?: string }) => void;
  'extension:error': (data: { bundle: string; message: string; stack?: string }) => void;
}

/**
 * Setup extension namespace handlers
 */
export function setupExtensionNamespace(namespace: Namespace, roomManager: RoomManager): void {
  const repos = getRepositories(logger);

  namespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(
      `Extension connected: ${socket.id} (user: ${socket.user?.username || 'anonymous'})`
    );

    // Join extensions room
    roomManager.joinRoom(socket, 'extensions').catch((error) => {
      logger.error('Failed to join extensions room:', error);
    });

    // Send connection acknowledgment
    socket.emit('extension:connected', {
      socketId: socket.id,
      authenticated: !!socket.user,
      timestamp: new Date().toISOString(),
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
            schema: replicant.schema,
          });

          logger.debug(
            `Extension ${socket.id} subscribed to replicant ${ns}:${name} (rev ${replicant.revision})`
          );
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

        logger.debug(`Extension ${socket.id} unsubscribed from replicant ${ns}:${name}`);
      } catch (error) {
        logger.error('Error unsubscribing from replicant:', error);
      }
    });

    /**
     * Update replicant value
     * Extensions can update replicants if authenticated
     */
    socket.on(
      'replicant:update',
      async (data: { namespace: string; name: string; value: string }) => {
        if (!socket.user) {
          socket.emit('replicant:error', {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          });
          return;
        }

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
            socket.user.username
          );

          // Broadcast update to all subscribers
          const roomName = `replicant:${ns}:${name}`;
          roomManager.broadcastToRoom(roomName, 'replicant:updated', {
            namespace: ns,
            name,
            value: replicant.value,
            revision: replicant.revision,
            updatedBy: socket.user.username,
          });

          // Acknowledge to sender
          socket.emit('replicant:updateSuccess', {
            namespace: ns,
            name,
            revision: replicant.revision,
          });

          logger.debug(
            `Extension ${socket.id} updated replicant ${ns}:${name} to rev ${replicant.revision}`
          );
        } catch (error) {
          logger.error('Error updating replicant:', error);
          socket.emit('replicant:error', {
            message: 'Failed to update replicant',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    /**
     * Create new replicant
     * Requires operator role
     */
    socket.on(
      'replicant:create',
      async (data: { namespace: string; name: string; value: string; schema?: string }) => {
        if (
          !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
            socket.emit('replicant:error', error);
          })
        ) {
          return;
        }

        try {
          const { namespace: ns, name, value, schema } = data;

          // Validate JSON
          try {
            JSON.parse(value);
            if (schema) {
              JSON.parse(schema);
            }
          } catch {
            socket.emit('replicant:error', {
              message: 'Invalid JSON value or schema',
              code: 'INVALID_JSON',
            });
            return;
          }

          // Create replicant
          const replicant = await repos.replicant.create({
            namespace: ns,
            name,
            value,
            schema: schema ?? undefined,
          });

          // Broadcast creation
          roomManager.broadcastToRoom('dashboard', 'replicant:created', {
            namespace: ns,
            name,
            createdBy: socket.user?.username,
          });

          socket.emit('replicant:createSuccess', {
            namespace: ns,
            name,
            id: replicant.id,
          });

          logger.info(`Extension ${socket.id} created replicant ${ns}:${name}`);
        } catch (error) {
          logger.error('Error creating replicant:', error);
          socket.emit('replicant:error', {
            message: 'Failed to create replicant',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    /**
     * Delete replicant
     * Requires operator role
     */
    socket.on('replicant:delete', async (data: { namespace: string; name: string }) => {
      if (
        !socketRequireRole(socket, ['OPERATOR', 'ADMIN'], (error) => {
          socket.emit('replicant:error', error);
        })
      ) {
        return;
      }

      try {
        const { namespace: ns, name } = data;

        await repos.replicant.deleteByNamespaceAndName(ns, name);

        // Broadcast deletion
        const roomName = `replicant:${ns}:${name}`;
        roomManager.broadcastToRoom(roomName, 'replicant:deleted', {
          namespace: ns,
          name,
          deletedBy: socket.user?.username,
        });

        roomManager.broadcastToRoom('dashboard', 'replicant:deleted', {
          namespace: ns,
          name,
          deletedBy: socket.user?.username,
        });

        socket.emit('replicant:deleteSuccess', { namespace: ns, name });

        logger.info(`Extension ${socket.id} deleted replicant ${ns}:${name}`);
      } catch (error) {
        logger.error('Error deleting replicant:', error);
        socket.emit('replicant:error', {
          message: 'Failed to delete replicant',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ===== INTER-EXTENSION MESSAGING =====

    /**
     * Send message to specific extension
     */
    socket.on('message:send', (data: { target: string; event: string; data: unknown }) => {
      try {
        const { target, event, data: msgData } = data;
        const roomName = `extension:${target}`;

        // Check if target room exists
        if (!roomManager.roomExists(roomName)) {
          socket.emit('message:error', {
            message: `Target extension not found: ${target}`,
            code: 'TARGET_NOT_FOUND',
          });
          return;
        }

        // Send to target extension
        roomManager.broadcastToRoom(roomName, event, {
          from: socket.id,
          data: msgData,
          timestamp: new Date().toISOString(),
        });

        socket.emit('message:sent', { target, event });

        logger.debug(`Extension ${socket.id} sent message to ${target}: ${event}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('message:error', {
          message: 'Failed to send message',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Broadcast message to all extensions
     */
    socket.on('message:broadcast', (data: { event: string; data: unknown }) => {
      try {
        const { event, data: msgData } = data;

        // Broadcast to all extensions except sender
        roomManager.broadcastToRoomExcept('extensions', socket.id, event, {
          from: socket.id,
          data: msgData,
          timestamp: new Date().toISOString(),
        });

        socket.emit('message:broadcasted', { event });

        logger.debug(`Extension ${socket.id} broadcasted message: ${event}`);
      } catch (error) {
        logger.error('Error broadcasting message:', error);
        socket.emit('message:error', {
          message: 'Failed to broadcast message',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ===== EXTENSION LIFECYCLE =====

    /**
     * Extension ready signal
     */
    socket.on('extension:ready', async (data: { bundle: string; version?: string }) => {
      try {
        const { bundle, version } = data;

        // Join bundle-specific room
        const roomName = `extension:${bundle}`;
        await roomManager.joinRoom(socket, roomName);

        logger.info(`Extension ready: ${bundle}${version ? ` v${version}` : ''} (${socket.id})`);

        // Broadcast to dashboard
        roomManager.broadcastToRoom('dashboard', 'extension:ready', {
          bundle,
          version,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });

        socket.emit('extension:readyAck', {
          bundle,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error marking extension ready:', error);
        socket.emit('extension:error', {
          message: 'Failed to mark extension ready',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Extension error signal
     */
    socket.on('extension:error', (data: { bundle: string; message: string; stack?: string }) => {
      const { bundle, message, stack } = data;

      logger.error(`Extension error: ${bundle} - ${message}`, stack ? { stack } : {});

      // Broadcast to dashboard
      roomManager.broadcastToRoom('dashboard', 'extension:error', {
        bundle,
        message,
        stack,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      socket.emit('extension:errorAck', {
        bundle,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    // ===== HEARTBEAT =====

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ===== DISCONNECTION =====

    socket.on('disconnect', async (reason) => {
      logger.info(
        `Extension disconnected: ${socket.id} (reason: ${reason}, user: ${socket.user?.username || 'anonymous'})`
      );

      // Broadcast to dashboard
      roomManager.broadcastToRoom('dashboard', 'extension:disconnected', {
        socketId: socket.id,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Leave all rooms
      await roomManager.leaveAllRooms(socket);

      // Cleanup tracking
      roomManager.cleanupSocket(socket.id);
    });
  });

  logger.info('Extension namespace initialized');
}
