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
import { getEventBus } from '../utils/event-bus';
import { getPrismaClient } from '../database/client';

const logger = createLogger({ level: 'info' });

let io: SocketIOServer | null = null;
let roomManager: RoomManager | null = null;
let replicantService: ReplicantService | null = null;
let syncManager: SyncManager | null = null;

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

  // Initialize Replicant Service
  try {
    const prisma = getPrismaClient(logger);
    const eventBus = getEventBus();

    replicantService = new ReplicantService(prisma, config, logger, eventBus);
    await replicantService.initialize();

    logger.info('Replicant Service initialized');

    // Initialize Sync Manager for real-time replicant synchronization
    syncManager = new SyncManager(replicantService, io, logger, eventBus);

    logger.info('Replicant Sync Manager initialized');
  } catch (error) {
    logger.error('Failed to initialize Replicant services:', error);
    throw error;
  }

  // Global error handler
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });

  // Log total connections
  io.on('connection', (socket) => {
    logger.debug(`Global connection: ${socket.id}`);
  });

  logger.info('WebSocket server initialized');
  logger.info('Available namespaces: /dashboard, /graphics, /extension');

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

    // Shutdown Replicant services
    if (syncManager) {
      syncManager.shutdown();
      syncManager = null;
      logger.info('Sync Manager shut down');
    }

    if (replicantService) {
      await replicantService.shutdown();
      replicantService = null;
      logger.info('Replicant Service shut down');
    }

    await new Promise<void>((resolve) => {
      io?.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
    io = null;
    roomManager = null;
  }
}
