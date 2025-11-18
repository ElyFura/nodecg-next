/**
 * Socket.IO WebSocket server implementation
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Logger } from '@nodecg/types';

export interface WebSocketServerOptions {
  httpServer: HTTPServer;
  logger: Logger;
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
}

export class WebSocketServer {
  private io: SocketIOServer;
  private logger: Logger;

  // Namespaces
  public dashboardNs: ReturnType<SocketIOServer['of']>;
  public graphicsNs: ReturnType<SocketIOServer['of']>;
  public extensionNs: ReturnType<SocketIOServer['of']>;

  constructor(options: WebSocketServerOptions) {
    this.logger = options.logger.child({ component: 'websocket' });

    // Initialize Socket.IO server
    this.io = new SocketIOServer(options.httpServer, {
      cors: options.cors || {
        origin: '*',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    // Create namespaces
    this.dashboardNs = this.io.of('/dashboard');
    this.graphicsNs = this.io.of('/graphics');
    this.extensionNs = this.io.of('/extension');

    // Set up namespace handlers
    this.setupDashboardNamespace();
    this.setupGraphicsNamespace();
    this.setupExtensionNamespace();

    this.logger.info('WebSocket server initialized');
  }

  private setupDashboardNamespace(): void {
    this.dashboardNs.on('connection', (socket: Socket) => {
      this.logger.info(`Dashboard client connected: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        this.logger.info(`Dashboard client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error) => {
        this.logger.error(`Dashboard socket error: ${socket.id}`, error);
      });
    });
  }

  private setupGraphicsNamespace(): void {
    this.graphicsNs.on('connection', (socket: Socket) => {
      this.logger.info(`Graphics client connected: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        this.logger.info(`Graphics client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error) => {
        this.logger.error(`Graphics socket error: ${socket.id}`, error);
      });
    });
  }

  private setupExtensionNamespace(): void {
    this.extensionNs.on('connection', (socket: Socket) => {
      this.logger.info(`Extension client connected: ${socket.id}`);

      socket.on('disconnect', (reason) => {
        this.logger.info(`Extension client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error) => {
        this.logger.error(`Extension socket error: ${socket.id}`, error);
      });
    });
  }

  /**
   * Broadcast to all clients in a namespace
   */
  public broadcast(
    namespace: 'dashboard' | 'graphics' | 'extension',
    event: string,
    data: unknown
  ): void {
    const ns =
      namespace === 'dashboard'
        ? this.dashboardNs
        : namespace === 'graphics'
          ? this.graphicsNs
          : this.extensionNs;
    ns.emit(event, data);
    this.logger.debug(`Broadcasted ${event} to ${namespace} namespace`);
  }

  /**
   * Broadcast to all namespaces
   */
  public broadcastAll(event: string, data: unknown): void {
    this.io.emit(event, data);
    this.logger.debug(`Broadcasted ${event} to all namespaces`);
  }

  /**
   * Get connected clients count
   */
  public async getClientCounts(): Promise<{
    dashboard: number;
    graphics: number;
    extension: number;
    total: number;
  }> {
    const [dashboardSockets, graphicsSockets, extensionSockets] = await Promise.all([
      this.dashboardNs.fetchSockets(),
      this.graphicsNs.fetchSockets(),
      this.extensionNs.fetchSockets(),
    ]);

    return {
      dashboard: dashboardSockets.length,
      graphics: graphicsSockets.length,
      extension: extensionSockets.length,
      total: dashboardSockets.length + graphicsSockets.length + extensionSockets.length,
    };
  }

  /**
   * Close the WebSocket server
   */
  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}
