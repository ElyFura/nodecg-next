/**
 * Replicant Client
 * Vanilla JavaScript client for NodeCG replicants with real-time synchronization
 */

import { io, Socket } from 'socket.io-client';

export interface ReplicantOptions<T = unknown> {
  defaultValue?: T;
  namespace?: string;
}

export type ReplicantChangeListener<T> = (newValue: T, oldValue: T | undefined) => void;

/**
 * Replicant Client Class
 * Manages a single replicant with real-time synchronization
 */
export class Replicant<T = unknown> {
  private socket: Socket;
  private _value: T | undefined;
  private _revision: number = 0;
  private listeners: Set<ReplicantChangeListener<T>> = new Set();
  private isSubscribed: boolean = false;

  public readonly namespace: string;
  public readonly name: string;
  public readonly defaultValue?: T;

  constructor(name: string, options: ReplicantOptions<T> = {}) {
    this.name = name;
    this.namespace = options.namespace || 'default';
    this.defaultValue = options.defaultValue;

    // Connect to replicant namespace
    this.socket = io('/replicants', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.setupSocketHandlers();
    this.subscribe();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    // Handle initial value
    this.socket.on(
      'initial',
      (data: { namespace: string; name: string; value: T; revision: number }) => {
        if (data.namespace === this.namespace && data.name === this.name) {
          const newValue = data.value ?? this.defaultValue;
          const oldValue = this._value;
          this._value = newValue;
          this._revision = data.revision;

          // Notify listeners if value changed
          if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
            this.notifyListeners(newValue as T, oldValue);
          }
        }
      }
    );

    // Handle real-time changes
    this.socket.on(
      'change',
      (data: {
        namespace: string;
        name: string;
        value: T;
        revision: number;
        operation: string;
      }) => {
        if (data.namespace === this.namespace && data.name === this.name) {
          const oldValue = this._value;
          this._value = data.value ?? this.defaultValue;
          this._revision = data.revision;

          // Notify listeners
          this.notifyListeners(this._value as T, oldValue);
        }
      }
    );

    // Handle reconnection
    this.socket.on('connect', () => {
      if (this.isSubscribed) {
        this.subscribe();
      }
    });
  }

  /**
   * Subscribe to replicant updates
   */
  private subscribe(): void {
    this.socket.emit('subscribe', {
      namespace: this.namespace,
      name: this.name,
    });
    this.isSubscribed = true;
  }

  /**
   * Unsubscribe from replicant updates
   */
  private unsubscribe(): void {
    if (this.isSubscribed) {
      this.socket.emit('unsubscribe', {
        namespace: this.namespace,
        name: this.name,
      });
      this.isSubscribed = false;
    }
  }

  /**
   * Get current value
   */
  get value(): T | undefined {
    return this._value ?? this.defaultValue;
  }

  /**
   * Set value (updates server and broadcasts to all clients)
   */
  set value(newValue: T) {
    const oldValue = this._value;

    // Optimistic update
    this._value = newValue;

    // Send to server
    this.socket.emit('set', {
      namespace: this.namespace,
      name: this.name,
      value: newValue,
    });

    // Notify local listeners immediately
    this.notifyListeners(newValue, oldValue);
  }

  /**
   * Get current revision number
   */
  get revision(): number {
    return this._revision;
  }

  /**
   * Add change listener
   */
  on(listener: ReplicantChangeListener<T>): void {
    this.listeners.add(listener);
  }

  /**
   * Remove change listener
   */
  off(listener: ReplicantChangeListener<T>): void {
    this.listeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(newValue: T, oldValue: T | undefined): void {
    for (const listener of this.listeners) {
      try {
        listener(newValue, oldValue);
      } catch (error) {
        console.error('Error in replicant listener:', error);
      }
    }
  }

  /**
   * Destroy the replicant (unsubscribe and cleanup)
   */
  destroy(): void {
    this.unsubscribe();
    this.removeAllListeners();
    this.socket.disconnect();
  }
}

/**
 * Create a new Replicant instance
 */
export function replicant<T = unknown>(name: string, options?: ReplicantOptions<T>): Replicant<T> {
  return new Replicant<T>(name, options);
}
