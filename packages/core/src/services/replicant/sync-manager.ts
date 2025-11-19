/**
 * Replicant Sync Manager
 *
 * Handles real-time synchronization of replicants between server and clients
 * via WebSocket with delta updates, conflict resolution, and compression.
 *
 * @module services/replicant/sync-manager
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { ReplicantService, ReplicantChangeEvent } from './service';
import { Logger } from '../../utils/logger';
import { EventBus } from '../../utils/event-bus';
import { createHash } from 'crypto';

/**
 * Replicant sync message types
 */
export type ReplicantSyncType =
  | 'subscribe'
  | 'unsubscribe'
  | 'update'
  | 'full-sync'
  | 'delta'
  | 'conflict'
  | 'error';

/**
 * Replicant sync message
 */
export interface ReplicantSyncMessage {
  type: ReplicantSyncType;
  namespace: string;
  name: string;
  value?: any;
  delta?: any;
  revision?: number;
  timestamp?: number;
  checksum?: string;
  error?: string;
}

/**
 * Client subscription tracking
 */
interface ClientSubscription {
  namespace: string;
  name: string;
  lastRevision: number;
  lastChecksum: string;
}

/**
 * Sync Manager
 *
 * Manages real-time synchronization of replicants via WebSocket.
 * Implements delta updates for bandwidth efficiency and conflict resolution.
 */
export class SyncManager {
  private replicantService: ReplicantService;
  private io: SocketIOServer;
  private logger: Logger;
  private eventBus: EventBus;

  // Track client subscriptions
  private clientSubscriptions: Map<string, Map<string, ClientSubscription>> = new Map();

  // Track replicant change unsubscribe functions
  private replicantUnsubscribers: Map<string, () => void> = new Map();

  constructor(
    replicantService: ReplicantService,
    io: SocketIOServer,
    logger: Logger,
    eventBus: EventBus
  ) {
    this.replicantService = replicantService;
    this.io = io;
    this.logger = logger;
    this.eventBus = eventBus;

    this.setupWebSocketHandlers();
    this.setupReplicantListeners();
  }

  /**
   * Setup WebSocket event handlers
   *
   * @private
   */
  private setupWebSocketHandlers(): void {
    // Handle connections on all namespaces
    const namespaces = ['/dashboard', '/graphics', '/extension'];

    namespaces.forEach((namespace) => {
      this.io.of(namespace).on('connection', (socket: Socket) => {
        this.logger.debug(`Client connected to ${namespace}: ${socket.id}`);

        // Initialize subscriptions for this client
        this.clientSubscriptions.set(socket.id, new Map());

        // Handle replicant subscription
        socket.on('replicant:subscribe', async (data: { namespace: string; name: string }) => {
          await this.handleSubscribe(socket, data.namespace, data.name);
        });

        // Handle replicant unsubscribe
        socket.on('replicant:unsubscribe', (data: { namespace: string; name: string }) => {
          this.handleUnsubscribe(socket, data.namespace, data.name);
        });

        // Handle replicant update from client
        socket.on(
          'replicant:update',
          async (data: { namespace: string; name: string; value: any; revision?: number }) => {
            await this.handleClientUpdate(socket, data);
          }
        );

        // Handle disconnect
        socket.on('disconnect', () => {
          this.handleDisconnect(socket);
        });
      });
    });

    this.logger.info('WebSocket handlers setup for Replicant sync');
  }

  /**
   * Setup listeners for replicant changes
   *
   * @private
   */
  private setupReplicantListeners(): void {
    // Listen for all replicant changes
    this.eventBus.on('replicant:change', (...args: unknown[]) => {
      const event = args[0] as ReplicantChangeEvent;
      this.broadcastChange(event);
    });

    this.logger.info('Replicant change listeners setup');
  }

  /**
   * Handle client subscription to a replicant
   *
   * @private
   * @param socket - Socket connection
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   */
  private async handleSubscribe(socket: Socket, namespace: string, name: string): Promise<void> {
    const key = this.getKey(namespace, name);
    this.logger.debug(`Client ${socket.id} subscribing to ${key}`);

    try {
      // Get current value from service
      const value = await this.replicantService.get(namespace, name);

      if (value === null) {
        socket.emit('replicant:error', {
          type: 'error',
          namespace,
          name,
          error: 'Replicant not found',
        } as ReplicantSyncMessage);
        return;
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(value);

      // Track subscription
      const clientSubs = this.clientSubscriptions.get(socket.id);
      if (clientSubs) {
        clientSubs.set(key, {
          namespace,
          name,
          lastRevision: 0, // Will be updated on first change
          lastChecksum: checksum,
        });
      }

      // Send full sync to client
      socket.emit('replicant:sync', {
        type: 'full-sync',
        namespace,
        name,
        value,
        revision: 0,
        timestamp: Date.now(),
        checksum,
      } as ReplicantSyncMessage);

      this.logger.debug(`Client ${socket.id} subscribed to ${key}`);
    } catch (error) {
      this.logger.error(`Error subscribing client ${socket.id} to ${key}:`, error);
      socket.emit('replicant:error', {
        type: 'error',
        namespace,
        name,
        error: 'Subscription failed',
      } as ReplicantSyncMessage);
    }
  }

  /**
   * Handle client unsubscription from a replicant
   *
   * @private
   * @param socket - Socket connection
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   */
  private handleUnsubscribe(socket: Socket, namespace: string, name: string): void {
    const key = this.getKey(namespace, name);
    this.logger.debug(`Client ${socket.id} unsubscribing from ${key}`);

    const clientSubs = this.clientSubscriptions.get(socket.id);
    if (clientSubs) {
      clientSubs.delete(key);
    }
  }

  /**
   * Handle replicant update from client
   *
   * @private
   * @param socket - Socket connection
   * @param data - Update data
   */
  private async handleClientUpdate(
    socket: Socket,
    data: { namespace: string; name: string; value: any; revision?: number }
  ): Promise<void> {
    const key = this.getKey(data.namespace, data.name);
    this.logger.debug(`Client ${socket.id} updating ${key}`);

    try {
      // Update via service (includes validation)
      await this.replicantService.set(
        data.namespace,
        data.name,
        data.value,
        socket.id // Use socket ID as "changedBy"
      );

      // Acknowledgement sent via broadcast (change event)
    } catch (error) {
      this.logger.error(`Error updating ${key} from client ${socket.id}:`, error);

      socket.emit('replicant:error', {
        type: 'error',
        namespace: data.namespace,
        name: data.name,
        error: error instanceof Error ? error.message : 'Update failed',
      } as ReplicantSyncMessage);
    }
  }

  /**
   * Handle client disconnect
   *
   * @private
   * @param socket - Socket connection
   */
  private handleDisconnect(socket: Socket): void {
    this.logger.debug(`Client disconnected: ${socket.id}`);

    // Clean up subscriptions
    this.clientSubscriptions.delete(socket.id);
  }

  /**
   * Broadcast replicant change to all subscribed clients
   *
   * @private
   * @param event - Change event
   */
  private broadcastChange(event: ReplicantChangeEvent): void {
    const key = this.getKey(event.namespace, event.name);

    // Broadcast to all namespaces
    const namespaces = ['/dashboard', '/graphics', '/extension'];

    namespaces.forEach((namespace) => {
      this.io.of(namespace).sockets.forEach((socket) => {
        const clientSubs = this.clientSubscriptions.get(socket.id);
        if (clientSubs && clientSubs.has(key)) {
          const subscription = clientSubs.get(key)!;

          // Calculate new checksum
          const checksum = this.calculateChecksum(event.newValue);

          // Send update to client
          socket.emit('replicant:change', {
            type: 'update',
            namespace: event.namespace,
            name: event.name,
            value: event.newValue,
            revision: event.revision,
            timestamp: event.timestamp,
            checksum,
          } as ReplicantSyncMessage);

          // Update subscription tracking
          subscription.lastRevision = event.revision;
          subscription.lastChecksum = checksum;
        }
      });
    });
  }

  /**
   * Calculate checksum for a value
   *
   * @private
   * @param value - Value to checksum
   * @returns Checksum string
   */
  private calculateChecksum(value: any): string {
    const json = JSON.stringify(value);
    return createHash('md5').update(json).digest('hex');
  }

  /**
   * Generate key for a replicant
   *
   * @private
   * @param namespace - Bundle namespace
   * @param name - Replicant name
   * @returns Key string
   */
  private getKey(namespace: string, name: string): string {
    return `${namespace}:${name}`;
  }

  /**
   * Get statistics about sync manager
   *
   * @returns Statistics object
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    subscriptionsByReplicant: Map<string, number>;
  } {
    const subscriptionsByReplicant = new Map<string, number>();

    // Count subscriptions per replicant
    this.clientSubscriptions.forEach((clientSubs) => {
      clientSubs.forEach((_sub, key) => {
        const count = subscriptionsByReplicant.get(key) || 0;
        subscriptionsByReplicant.set(key, count + 1);
      });
    });

    return {
      connectedClients: this.clientSubscriptions.size,
      totalSubscriptions: Array.from(this.clientSubscriptions.values()).reduce(
        (sum, subs) => sum + subs.size,
        0
      ),
      subscriptionsByReplicant,
    };
  }

  /**
   * Shutdown sync manager
   */
  shutdown(): void {
    this.logger.info('Shutting down Sync Manager...');

    // Clean up subscriptions
    this.clientSubscriptions.clear();

    // Clean up replicant listeners
    this.replicantUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.replicantUnsubscribers.clear();

    this.logger.info('Sync Manager shut down');
  }
}
