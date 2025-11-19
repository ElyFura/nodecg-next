/**
 * Graphics WebSocket Namespace
 * Handles real-time communication for NodeCG graphics (overlays, lower thirds, etc.)
 */

import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { RoomManager } from '../rooms';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface GraphicsEvents {
  // Replicant events
  'replicant:subscribe': (data: { namespace: string; name: string }) => void;
  'replicant:unsubscribe': (data: { namespace: string; name: string }) => void;

  // Graphics lifecycle events
  'graphic:ready': (data: { url: string; bundle?: string }) => void;
  'graphic:error': (data: { message: string; url: string }) => void;

  // Asset events
  'asset:request': (data: { namespace: string; name: string }) => void;
}

/**
 * Setup graphics namespace handlers
 */
export function setupGraphicsNamespace(namespace: Namespace, roomManager: RoomManager): void {
  const repos = getRepositories(logger);

  namespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Graphics connected: ${socket.id} (user: ${socket.user?.username || 'anonymous'})`);

    // Join graphics room
    roomManager.joinRoom(socket, 'graphics').catch((error) => {
      logger.error('Failed to join graphics room:', error);
    });

    // Send connection acknowledgment
    socket.emit('graphics:connected', {
      socketId: socket.id,
      authenticated: !!socket.user,
      timestamp: new Date().toISOString(),
    });

    // ===== REPLICANT EVENTS =====

    /**
     * Subscribe to replicant updates
     * Graphics need read-only access to replicants for display
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

          logger.debug(
            `Graphics ${socket.id} subscribed to replicant ${ns}:${name} (rev ${replicant.revision})`
          );
        } else {
          socket.emit('replicant:notFound', { namespace: ns, name });
          logger.warn(`Graphics ${socket.id} subscribed to non-existent replicant ${ns}:${name}`);
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

        logger.debug(`Graphics ${socket.id} unsubscribed from replicant ${ns}:${name}`);
      } catch (error) {
        logger.error('Error unsubscribing from replicant:', error);
      }
    });

    // ===== GRAPHICS LIFECYCLE EVENTS =====

    /**
     * Graphics ready signal
     * Sent when a graphic has fully loaded and is ready to display
     */
    socket.on('graphic:ready', (data: { url: string; bundle?: string }) => {
      logger.info(`Graphic ready: ${data.url} (bundle: ${data.bundle || 'unknown'})`);

      // Broadcast to dashboard that a graphic is ready
      roomManager.broadcastToRoom('dashboard', 'graphics:ready', {
        socketId: socket.id,
        url: data.url,
        bundle: data.bundle,
        timestamp: new Date().toISOString(),
      });

      // Acknowledge
      socket.emit('graphic:readyAck', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Graphics error signal
     * Sent when a graphic encounters an error during loading or operation
     */
    socket.on('graphic:error', (data: { message: string; url: string; stack?: string }) => {
      logger.error(`Graphic error: ${data.url} - ${data.message}`);

      // Broadcast to dashboard
      roomManager.broadcastToRoom('dashboard', 'graphics:error', {
        socketId: socket.id,
        url: data.url,
        message: data.message,
        stack: data.stack,
        timestamp: new Date().toISOString(),
      });

      // Acknowledge
      socket.emit('graphic:errorAck', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    // ===== ASSET EVENTS =====

    /**
     * Request asset information
     * Graphics may need asset metadata for display
     */
    socket.on('asset:request', async (data: { namespace: string; name: string }) => {
      try {
        const { namespace: ns, name } = data;

        const allAssets = await repos.asset.findByNamespace(ns);
        const asset = allAssets.find((a) => a.name === name);

        if (asset) {
          socket.emit('asset:info', {
            namespace: ns,
            name: asset.name,
            url: asset.url,
            mimeType: asset.mimeType,
            size: asset.size,
          });

          logger.debug(`Graphics ${socket.id} requested asset ${ns}:${name}`);
        } else {
          socket.emit('asset:notFound', { namespace: ns, name });
          logger.warn(`Graphics ${socket.id} requested non-existent asset ${ns}:${name}`);
        }
      } catch (error) {
        logger.error('Error requesting asset:', error);
        socket.emit('asset:error', {
          message: 'Failed to get asset information',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ===== BUNDLE-SPECIFIC ROOMS =====

    /**
     * Join bundle-specific room
     * Allows graphics from same bundle to communicate
     */
    socket.on('bundle:join', async (data: { bundle: string }) => {
      try {
        const roomName = `bundle:${data.bundle}`;
        await roomManager.joinRoom(socket, roomName);

        logger.debug(`Graphics ${socket.id} joined bundle room: ${data.bundle}`);

        socket.emit('bundle:joined', {
          bundle: data.bundle,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error joining bundle room:', error);
        socket.emit('bundle:error', {
          message: 'Failed to join bundle room',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * Leave bundle-specific room
     */
    socket.on('bundle:leave', async (data: { bundle: string }) => {
      try {
        const roomName = `bundle:${data.bundle}`;
        await roomManager.leaveRoom(socket, roomName);

        logger.debug(`Graphics ${socket.id} left bundle room: ${data.bundle}`);

        socket.emit('bundle:left', {
          bundle: data.bundle,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error leaving bundle room:', error);
      }
    });

    // ===== HEARTBEAT =====

    /**
     * Heartbeat to keep connection alive
     */
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ===== DISCONNECTION =====

    socket.on('disconnect', async (reason) => {
      logger.info(
        `Graphics disconnected: ${socket.id} (reason: ${reason}, user: ${socket.user?.username || 'anonymous'})`
      );

      // Broadcast to dashboard that a graphic disconnected
      roomManager.broadcastToRoom('dashboard', 'graphics:disconnected', {
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

  logger.info('Graphics namespace initialized');
}
