/**
 * Core type definitions for NodeCG Next
 */

export interface NodeCGConfig {
  /** Server host */
  host: string;
  /** Server port */
  port: number;
  /** Base URL */
  baseURL?: string;
  /** Enable SSL */
  ssl?: {
    enabled: boolean;
    keyPath?: string;
    certPath?: string;
  };
  /** Logging configuration */
  logging?: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    file?: string;
  };
  /** CORS configuration */
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
  };
  /** Database configuration */
  database?: {
    url: string;
    provider: 'postgresql' | 'sqlite' | 'mysql';
  };
  /** Redis configuration */
  redis?: {
    url: string;
    prefix?: string;
  };
  /** RabbitMQ configuration */
  rabbitmq?: {
    url: string;
  };
  /** Asset storage configuration */
  assets?: {
    provider: 's3' | 'minio' | 'local';
    bucket?: string;
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export interface NodeCGServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getConfig(): NodeCGConfig;
}

export interface Logger {
  trace(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string | Error, ...args: unknown[]): void;
  fatal(msg: string | Error, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface EventBus {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  once(event: string, handler: (...args: unknown[]) => void): () => void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  removeAllListeners(event?: string): void;
}
