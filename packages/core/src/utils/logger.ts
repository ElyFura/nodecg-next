/**
 * Logger utility using Pino
 */

import pino from 'pino';
import { Logger } from '@nodecg/types';

export function createLogger(config?: {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  file?: string;
}): Logger {
  const logger = pino({
    level: config?.level || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });

  return {
    trace(msg: string, ...args: unknown[]) {
      logger.trace(args.length > 0 ? { args } : {}, msg);
    },
    debug(msg: string, ...args: unknown[]) {
      logger.debug(args.length > 0 ? { args } : {}, msg);
    },
    info(msg: string, ...args: unknown[]) {
      logger.info(args.length > 0 ? { args } : {}, msg);
    },
    warn(msg: string, ...args: unknown[]) {
      logger.warn(args.length > 0 ? { args } : {}, msg);
    },
    error(msg: string | Error, ...args: unknown[]) {
      if (msg instanceof Error) {
        logger.error(args.length > 0 ? { err: msg, args } : { err: msg }, msg.message);
      } else {
        logger.error(args.length > 0 ? { args } : {}, msg);
      }
    },
    fatal(msg: string | Error, ...args: unknown[]) {
      if (msg instanceof Error) {
        logger.fatal(args.length > 0 ? { err: msg, args } : { err: msg }, msg.message);
      } else {
        logger.fatal(args.length > 0 ? { args } : {}, msg);
      }
    },
    child(bindings: Record<string, unknown>) {
      const childLogger = logger.child(bindings);
      return createLoggerFromPino(childLogger);
    },
  };
}

function createLoggerFromPino(pinoLogger: pino.Logger): Logger {
  return {
    trace(msg: string, ...args: unknown[]) {
      pinoLogger.trace(args.length > 0 ? { args } : {}, msg);
    },
    debug(msg: string, ...args: unknown[]) {
      pinoLogger.debug(args.length > 0 ? { args } : {}, msg);
    },
    info(msg: string, ...args: unknown[]) {
      pinoLogger.info(args.length > 0 ? { args } : {}, msg);
    },
    warn(msg: string, ...args: unknown[]) {
      pinoLogger.warn(args.length > 0 ? { args } : {}, msg);
    },
    error(msg: string | Error, ...args: unknown[]) {
      if (msg instanceof Error) {
        pinoLogger.error(args.length > 0 ? { err: msg, args } : { err: msg }, msg.message);
      } else {
        pinoLogger.error(args.length > 0 ? { args } : {}, msg);
      }
    },
    fatal(msg: string | Error, ...args: unknown[]) {
      if (msg instanceof Error) {
        pinoLogger.fatal(args.length > 0 ? { err: msg, args } : { err: msg }, msg.message);
      } else {
        pinoLogger.fatal(args.length > 0 ? { args } : {}, msg);
      }
    },
    child(bindings: Record<string, unknown>) {
      return createLoggerFromPino(pinoLogger.child(bindings));
    },
  };
}
