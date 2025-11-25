/**
 * Sync Manager
 * Handles real-time synchronization of replicants via WebSocket
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ReplicantService, ReplicantValue } from './replicant.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ level: 'info' });

export interface SyncMessage {
  type: 'subscribe' | 'unsubscribe' | 'change' | 'set' | 'get';
  namespace: string;
  name: string;
  value?: unknown;
  revision?: number;
}

export interface ChangeMessage {
  namespace: string;
  name: string;
  value: unknown;
  revision: number;
  operation: 'create' | 'update' | 'delete';
}

/**
 * Sync Manager - Manages real-time replicant synchronization over WebSocket
 */
export class SyncManager {
  private io: SocketIOServer;
  private replicantService: ReplicantService;
  private clientSockets: Map<string, Socket> = new Map();

  constructor(io: SocketIOServer, replicantService: ReplicantService) {
    this.io = io;
    this.replicantService = replicantService;

    // Listen to replicant changes
    this.replicantService.on('change', this.handleReplicantChange.bind(this));

    // Setup Socket.IO namespace for replicants
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO handlers
   */
  private setupSocketHandlers(): void {
    const replicantNamespace = this.io.of('/replicants');

    replicantNamespace.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      this.clientSockets.set(clientId, socket);

      logger.info(`Client connected to replicant sync: ${clientId}`);

      // Handle subscribe requests
      socket.on('subscribe', async (data: { namespace: string; name: string }) => {
        // Debug logging - see exactly what we receive
        console.log('=== SUBSCRIBE EVENT DEBUG ===');
        console.log('Raw data:', data);
        console.log('Data type:', typeof data);
        console.log('Data constructor:', data?.constructor?.name);
        console.log('Data keys:', data ? Object.keys(data) : 'null/undefined');
        console.log('Data JSON:', JSON.stringify(data));
        console.log('============================');

        try {
          // Validate data
          if (!data || typeof data !== 'object') {
            logger.error(`Invalid subscribe data from ${clientId}:`, data);
            socket.emit('error', { message: 'Invalid subscribe data: expected object' });
            return;
          }

          const { namespace, name } = data;

          if (!namespace || !name) {
            logger.error(`Missing namespace or name from ${clientId}:`, { namespace, name });
            socket.emit('error', {
              message: 'Missing required fields: namespace and name',
            });
            return;
          }

          logger.debug(`Client ${clientId} subscribing to ${namespace}:${name}`);

          // Subscribe client
          this.replicantService.subscribe(namespace, name, clientId);

          // Send current value
          const current = await this.replicantService.get(namespace, name);
          socket.emit('initial', {
            namespace,
            name,
            value: current?.value ?? null,
            revision: current?.revision ?? 0,
          });

          socket.emit('subscribed', { namespace, name });
        } catch (error) {
          console.error('=== SUBSCRIBE ERROR ===');
          console.error('Error:', error);
          console.error('Error message:', error instanceof Error ? error.message : String(error));
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          console.error('=======================');
          logger.error(
            'Error handling subscribe:',
            error instanceof Error ? error.message : String(error)
          );
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      // Handle unsubscribe requests
      socket.on('unsubscribe', (data: { namespace: string; name: string }) => {
        try {
          const { namespace, name } = data;
          logger.debug(`Client ${clientId} unsubscribing from ${namespace}:${name}`);

          this.replicantService.unsubscribe(namespace, name, clientId);
          socket.emit('unsubscribed', { namespace, name });
        } catch (error) {
          logger.error('Error handling unsubscribe:', error);
        }
      });

      // Handle set requests (client wants to update replicant)
      socket.on('set', async (data: { namespace: string; name: string; value: unknown }) => {
        // Debug logging - see exactly what we receive
        console.log('=== SET EVENT DEBUG ===');
        console.log('Raw data:', data);
        console.log('Data type:', typeof data);
        console.log('Data constructor:', data?.constructor?.name);
        console.log('Data keys:', data ? Object.keys(data) : 'null/undefined');
        console.log('Data JSON:', JSON.stringify(data));
        console.log('=======================');

        try {
          // Validate data
          if (!data || typeof data !== 'object') {
            logger.error(`Invalid set data from ${clientId}:`, data);
            socket.emit('error', { message: 'Invalid set data: expected object' });
            return;
          }

          const { namespace, name, value } = data;

          if (!namespace || !name) {
            logger.error(`Missing namespace or name from ${clientId}:`, { namespace, name });
            socket.emit('set-ack', {
              namespace,
              name,
              success: false,
              error: 'Missing required fields: namespace and name',
            });
            return;
          }

          logger.debug(`Client ${clientId} setting ${namespace}:${name} to:`, value);

          // Update replicant (will trigger change event automatically)
          const result = await this.replicantService.set(namespace, name, value);

          // Send acknowledgment
          socket.emit('set-ack', {
            namespace,
            name,
            revision: result.revision,
            success: true,
          });
        } catch (error) {
          console.error('=== SET ERROR ===');
          console.error('Error:', error);
          console.error('Error message:', error instanceof Error ? error.message : String(error));
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          console.error('=================');
          logger.error(
            'Error handling set:',
            error instanceof Error ? error.message : String(error)
          );
          socket.emit('set-ack', {
            namespace: data?.namespace,
            name: data?.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle get requests (client wants current value)
      socket.on('get', async (data: { namespace: string; name: string }) => {
        try {
          const { namespace, name } = data;
          const result = await this.replicantService.get(namespace, name);

          socket.emit('get-response', {
            namespace,
            name,
            value: result?.value ?? null,
            revision: result?.revision ?? 0,
          });
        } catch (error) {
          logger.error('Error handling get:', error);
          socket.emit('error', { message: 'Failed to get replicant' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected from replicant sync: ${clientId}`);
        this.replicantService.unsubscribeAll(clientId);
        this.clientSockets.delete(clientId);
      });
    });
  }

  /**
   * Handle replicant changes and broadcast to subscribers
   */
  private handleReplicantChange(event: {
    namespace: string;
    name: string;
    value: ReplicantValue<unknown> | null;
    operation: 'create' | 'update' | 'delete';
    subscribers: string[];
  }): void {
    const { namespace, name, value, operation, subscribers } = event;

    logger.debug(
      `Broadcasting change for ${namespace}:${name} to ${subscribers.length} subscribers`
    );

    // Broadcast to all subscribers on /replicants namespace
    for (const subscriberId of subscribers) {
      const socket = this.clientSockets.get(subscriberId);
      if (socket) {
        socket.emit('change', {
          namespace,
          name,
          value: value?.value ?? null,
          revision: value?.revision ?? 0,
          operation,
        });
      }
    }

    // Also broadcast to dashboard and graphics namespaces via room system
    // This ensures clients connected to /dashboard or /graphics also receive updates
    const roomName = `replicant:${namespace}:${name}`;
    const updatePayload = {
      namespace,
      name,
      value: value?.value ?? null,
      revision: value?.revision ?? 0,
      operation,
    };

    // Broadcast to dashboard namespace
    this.io.of('/dashboard').to(roomName).emit('replicant:updated', updatePayload);

    // Broadcast to graphics namespace
    this.io.of('/graphics').to(roomName).emit('replicant:updated', updatePayload);

    // Broadcast to extension namespace
    this.io.of('/extension').to(roomName).emit('replicant:updated', updatePayload);

    logger.debug(`Broadcasted ${namespace}:${name} update to all namespaces via room ${roomName}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(namespace: string, name: string, value: unknown, revision: number): void {
    const replicantNamespace = this.io.of('/replicants');
    replicantNamespace.emit('change', {
      namespace,
      name,
      value,
      revision,
      operation: 'update',
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clientSockets.size;
  }

  /**
   * Get subscribers for a replicant
   */
  getSubscribers(namespace: string, name: string): string[] {
    return this.replicantService.getSubscribers(namespace, name);
  }
}
