/**
 * Configuration Loader and Validator
 * Loads and validates NodeCG configuration using Zod schemas
 */

import { z } from 'zod';
import { NodeCGConfig } from '@nodecg/types';
import { createLogger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger({ level: 'info' });

/**
 * Zod schema for SSL configuration
 */
const sslSchema = z.object({
  enabled: z.boolean(),
  keyPath: z.string().optional(),
  certPath: z.string().optional(),
});

/**
 * Zod schema for logging configuration
 */
const loggingSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  file: z.string().optional(),
});

/**
 * Zod schema for CORS configuration
 */
const corsSchema = z.object({
  origin: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
  credentials: z.boolean().optional(),
});

/**
 * Zod schema for database configuration
 */
const databaseSchema = z.object({
  url: z.string(),
  provider: z.enum(['postgresql', 'sqlite', 'mysql']),
});

/**
 * Zod schema for Redis configuration
 */
const redisSchema = z.object({
  url: z.string(),
  prefix: z.string().optional(),
});

/**
 * Zod schema for RabbitMQ configuration
 */
const rabbitmqSchema = z.object({
  url: z.string(),
});

/**
 * Zod schema for asset storage configuration
 */
const assetsSchema = z.object({
  provider: z.enum(['s3', 'minio', 'local']),
  bucket: z.string().optional(),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

/**
 * Complete NodeCG configuration schema
 */
export const nodeCGConfigSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.number().int().min(1).max(65535).default(3000),
  baseURL: z.string().url().optional(),
  ssl: sslSchema.optional(),
  logging: loggingSchema.optional().default({ level: 'info' }),
  cors: corsSchema.optional(),
  database: databaseSchema.optional(),
  redis: redisSchema.optional(),
  rabbitmq: rabbitmqSchema.optional(),
  assets: assetsSchema.optional(),
});

export type ValidatedConfig = z.infer<typeof nodeCGConfigSchema>;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: NodeCGConfig = {
  host: '0.0.0.0',
  port: 3000,
  logging: {
    level: 'info',
  },
};

/**
 * Configuration file paths to search (in order)
 */
const CONFIG_PATHS = [
  'nodecg.config.json',
  'nodecg.config.js',
  'config/nodecg.json',
  'config/default.json',
  '.nodecgrc',
];

/**
 * Load configuration from file
 */
function loadConfigFromFile(configPath?: string): Partial<NodeCGConfig> | null {
  // If specific path provided, try only that path
  if (configPath) {
    if (fs.existsSync(configPath)) {
      logger.info(`Loading configuration from: ${configPath}`);
      const content = fs.readFileSync(configPath, 'utf-8');

      if (configPath.endsWith('.js')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(path.resolve(configPath));
      } else {
        return JSON.parse(content);
      }
    } else {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
  }

  // Try each default path
  for (const filePath of CONFIG_PATHS) {
    if (fs.existsSync(filePath)) {
      logger.info(`Loading configuration from: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (filePath.endsWith('.js')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(path.resolve(filePath));
      } else {
        return JSON.parse(content);
      }
    }
  }

  return null;
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): Partial<NodeCGConfig> {
  const config: Partial<NodeCGConfig> = {};

  if (process.env.NODECG_HOST) {
    config.host = process.env.NODECG_HOST;
  }

  if (process.env.NODECG_PORT) {
    config.port = parseInt(process.env.NODECG_PORT, 10);
  }

  if (process.env.NODECG_BASE_URL) {
    config.baseURL = process.env.NODECG_BASE_URL;
  }

  if (process.env.NODECG_LOG_LEVEL) {
    config.logging = {
      level: process.env.NODECG_LOG_LEVEL as
        | 'trace'
        | 'debug'
        | 'info'
        | 'warn'
        | 'error'
        | 'fatal',
    };
  }

  if (process.env.DATABASE_URL) {
    config.database = {
      url: process.env.DATABASE_URL,
      provider:
        (process.env.DATABASE_PROVIDER as 'postgresql' | 'sqlite' | 'mysql') || 'postgresql',
    };
  }

  if (process.env.REDIS_URL) {
    config.redis = {
      url: process.env.REDIS_URL,
      prefix: process.env.REDIS_PREFIX,
    };
  }

  return config;
}

/**
 * Merge configuration objects with deep merge
 */
function mergeConfig(
  base: Partial<NodeCGConfig>,
  override: Partial<NodeCGConfig>
): Partial<NodeCGConfig> {
  const merged: Record<string, unknown> = { ...base };

  for (const key in override) {
    const value = override[key as keyof NodeCGConfig];
    if (value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        merged[key] = {
          ...((merged[key] as object) || {}),
          ...(value as object),
        };
      } else {
        merged[key] = value;
      }
    }
  }

  return merged as Partial<NodeCGConfig>;
}

/**
 * Load and validate configuration
 */
export function loadConfig(configPath?: string): NodeCGConfig {
  logger.info('Loading NodeCG configuration...');

  // Start with defaults
  let config: Partial<NodeCGConfig> = { ...DEFAULT_CONFIG };

  // Load from file
  const fileConfig = loadConfigFromFile(configPath);
  if (fileConfig) {
    config = mergeConfig(config, fileConfig);
    logger.info('Configuration loaded from file');
  } else {
    logger.info('No configuration file found, using defaults');
  }

  // Override with environment variables
  const envConfig = loadConfigFromEnv();
  if (Object.keys(envConfig).length > 0) {
    config = mergeConfig(config, envConfig);
    logger.info('Configuration overridden with environment variables');
  }

  // Validate configuration
  try {
    const validated = nodeCGConfigSchema.parse(config);
    logger.info('Configuration validated successfully');
    return validated as NodeCGConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

/**
 * Validate configuration without loading
 */
export function validateConfig(config: unknown): NodeCGConfig {
  try {
    return nodeCGConfigSchema.parse(config) as NodeCGConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get configuration value by path
 */
export function getConfigValue<T = unknown>(
  config: NodeCGConfig,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let value: unknown = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }

  return value as T;
}

/**
 * Check if configuration has a specific feature enabled
 */
export function hasFeature(config: NodeCGConfig, feature: string): boolean {
  switch (feature) {
    case 'ssl':
      return !!config.ssl?.enabled;
    case 'database':
      return !!config.database;
    case 'redis':
      return !!config.redis;
    case 'rabbitmq':
      return !!config.rabbitmq;
    case 'assets':
      return !!config.assets;
    default:
      return false;
  }
}

/**
 * Export configuration to JSON file
 */
export function exportConfig(config: NodeCGConfig, filePath: string): void {
  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');
  logger.info(`Configuration exported to: ${filePath}`);
}

/**
 * Print configuration summary
 */
export function printConfigSummary(config: NodeCGConfig): void {
  logger.info('Configuration Summary:');
  logger.info(`  Host: ${config.host}`);
  logger.info(`  Port: ${config.port}`);
  logger.info(`  Base URL: ${config.baseURL || 'Not set'}`);
  logger.info(`  Log Level: ${config.logging?.level || 'info'}`);
  logger.info(`  SSL Enabled: ${config.ssl?.enabled ? 'Yes' : 'No'}`);
  logger.info(`  Database: ${config.database ? config.database.provider : 'Not configured'}`);
  logger.info(`  Redis: ${config.redis ? 'Configured' : 'Not configured'}`);
  logger.info(`  RabbitMQ: ${config.rabbitmq ? 'Configured' : 'Not configured'}`);
  logger.info(`  Assets: ${config.assets ? config.assets.provider : 'Not configured'}`);
}
