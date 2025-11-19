/**
 * WebSocket Namespaces
 * Exports all namespace handlers and setup utilities
 */

import { Server } from 'socket.io';
import { socketAuth, socketOptionalAuth } from '../middleware/auth';
import { RoomManager, createRoomManager } from '../rooms';
import { setupDashboardNamespace } from './dashboard';
import { setupGraphicsNamespace } from './graphics';
import { setupExtensionNamespace } from './extension';
import { createLogger } from '../../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface NamespaceConfig {
  auth?: 'required' | 'optional' | 'none';
}

export interface SocketNamespaces {
  dashboard: ReturnType<typeof setupDashboardNamespace>;
  graphics: ReturnType<typeof setupGraphicsNamespace>;
  extension: ReturnType<typeof setupExtensionNamespace>;
}

/**
 * Setup all WebSocket namespaces
 */
export function setupNamespaces(io: Server): RoomManager {
  const roomManager = createRoomManager(io);

  // Dashboard namespace - requires authentication
  const dashboardNs = io.of('/dashboard');
  dashboardNs.use(socketAuth);
  setupDashboardNamespace(dashboardNs, roomManager);

  // Graphics namespace - optional authentication
  const graphicsNs = io.of('/graphics');
  graphicsNs.use(socketOptionalAuth);
  setupGraphicsNamespace(graphicsNs, roomManager);

  // Extension namespace - optional authentication (some extensions may be unauthenticated)
  const extensionNs = io.of('/extension');
  extensionNs.use(socketOptionalAuth);
  setupExtensionNamespace(extensionNs, roomManager);

  logger.info('All WebSocket namespaces initialized');

  return roomManager;
}

// Export individual namespace handlers
export { setupDashboardNamespace } from './dashboard';
export { setupGraphicsNamespace } from './graphics';
export { setupExtensionNamespace } from './extension';

// Export types
export type { DashboardEvents } from './dashboard';
export type { GraphicsEvents } from './graphics';
export type { ExtensionEvents } from './extension';
