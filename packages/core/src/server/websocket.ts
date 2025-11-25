/**
 * WebSocket Server Setup
 * Integrates Socket.IO with Fastify server and registers all namespaces
 */

import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { NodeCGConfig } from '@nodecg/types';
import { setupNamespaces } from '../gateway/websocket/namespaces';
import { RoomManager } from '../gateway/websocket/rooms';
import { createLogger } from '../utils/logger';
import { ReplicantService, SyncManager } from '../services/replicant';
import { getRepositories } from '../database/client';
import { getRedisClient } from '../database/redis';

const logger = createLogger({ level: 'info' });

let io: SocketIOServer | null = null;
let roomManager: RoomManager | null = null;
let replicantService: ReplicantService | null = null;
let syncManager: SyncManager | null = null;

/**
 * Setup replicant subscription handlers on dashboard and graphics namespaces
 * This must be called AFTER ReplicantService is created
 */
function setupReplicantHandlers(io: SocketIOServer, replicantService: ReplicantService): void {
  const namespaces = ['/dashboard', '/graphics'];

  namespaces.forEach((nsName) => {
    const namespace = io.of(nsName);

    // For each currently connected socket, add replicant subscription tracking
    namespace.sockets.forEach((socket) => {
      addReplicantSubscriptionTracking(socket, replicantService);
    });

    // For future connections, add tracking on connection
    namespace.on('connection', (socket) => {
      addReplicantSubscriptionTracking(socket, replicantService);
    });
  });

  logger.info('Replicant subscription handlers added to dashboard and graphics namespaces');
}

/**
 * Add replicant subscription tracking to a socket
 */
function addReplicantSubscriptionTracking(socket: any, replicantService: ReplicantService): void {
  // Intercept replicant:subscribe to also subscribe in ReplicantService
  const originalSubscribeHandler = socket.listeners('replicant:subscribe')[0];
  if (originalSubscribeHandler) {
    socket.off('replicant:subscribe', originalSubscribeHandler);
    socket.on('replicant:subscribe', async (data: { namespace: string; name: string }) => {
      // Call original handler first
      await originalSubscribeHandler(data);

      // Also subscribe in ReplicantService for change events
      if (data?.namespace && data?.name) {
        replicantService.subscribe(data.namespace, data.name, socket.id);
        logger.debug(
          `Socket ${socket.id} subscribed to ${data.namespace}:${data.name} in ReplicantService`
        );
      }
    });
  }

  // Intercept replicant:unsubscribe to also unsubscribe in ReplicantService
  const originalUnsubscribeHandler = socket.listeners('replicant:unsubscribe')[0];
  if (originalUnsubscribeHandler) {
    socket.off('replicant:unsubscribe', originalUnsubscribeHandler);
    socket.on('replicant:unsubscribe', async (data: { namespace: string; name: string }) => {
      // Call original handler first
      await originalUnsubscribeHandler(data);

      // Also unsubscribe in ReplicantService
      if (data?.namespace && data?.name) {
        replicantService.unsubscribe(data.namespace, data.name, socket.id);
        logger.debug(
          `Socket ${socket.id} unsubscribed from ${data.namespace}:${data.name} in ReplicantService`
        );
      }
    });
  }

  // Cleanup on disconnect
  const originalDisconnectHandler = socket.listeners('disconnect')[0];
  if (originalDisconnectHandler) {
    socket.once('disconnect', () => {
      replicantService.unsubscribeAll(socket.id);
      logger.debug(`Socket ${socket.id} cleaned up from ReplicantService on disconnect`);
    });
  }
}

/**
 * Setup WebSocket server with Socket.IO
 */
export async function setupWebSocket(
  fastify: FastifyInstance,
  config: NodeCGConfig
): Promise<SocketIOServer> {
  if (io) {
    logger.warn('WebSocket server already initialized');
    return io;
  }

  logger.info('Setting up WebSocket server...');

  // Create Socket.IO server attached to Fastify HTTP server
  io = new SocketIOServer(fastify.server, {
    cors: {
      origin: config.cors?.origin || '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8, // 100 MB for asset uploads
    transports: ['websocket', 'polling'],
    allowEIO3: true, // Support older Socket.IO clients
  });

  // Setup all namespaces (dashboard, graphics, extension)
  roomManager = setupNamespaces(io);

  // Initialize Replicant Service and SyncManager
  logger.info('Initializing Replicant Service and SyncManager...');
  const repositories = getRepositories(logger);
  const redis = getRedisClient(logger);

  replicantService = new ReplicantService(repositories.replicant, redis);
  syncManager = new SyncManager(io, replicantService);

  // Setup replicant subscription handlers on dashboard and graphics namespaces
  setupReplicantHandlers(io, replicantService);

  // Make replicantService available on Fastify instance
  (fastify as FastifyInstance & { replicantService: ReplicantService }).replicantService =
    replicantService;

  // Set replicantService on BundleManager to enable extension execution
  const bundleManager = (fastify as any).bundleManager;
  if (bundleManager && typeof bundleManager.setReplicantService === 'function') {
    bundleManager.setReplicantService(replicantService);
  }

  // Set Socket.IO server on BundleManager to enable message handling in extensions
  if (bundleManager && typeof bundleManager.setSocketIO === 'function') {
    bundleManager.setSocketIO(io);
  }

  logger.info('Replicant Service and SyncManager initialized');

  // Global error handler
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });

  // Log total connections
  io.on('connection', (socket) => {
    logger.debug(`Global connection: ${socket.id}`);
  });

  logger.info('WebSocket server initialized');
  logger.info('Available namespaces: /dashboard, /graphics, /extension, /replicants');

  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Get Room Manager instance
 */
export function getRoomManager(): RoomManager | null {
  return roomManager;
}

/**
 * Get Replicant Service instance
 */
export function getReplicantService(): ReplicantService | null {
  return replicantService;
}

/**
 * Get Sync Manager instance
 */
export function getSyncManager(): SyncManager | null {
  return syncManager;
}

/**
 * Close WebSocket server
 */
export async function closeWebSocket(): Promise<void> {
  if (io) {
    logger.info('Closing WebSocket server...');
    await new Promise<void>((resolve) => {
      io?.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
    io = null;
    roomManager = null;
    replicantService = null;
    syncManager = null;
  }
}
