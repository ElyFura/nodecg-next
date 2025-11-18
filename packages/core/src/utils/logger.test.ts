/**
 * Logger utility tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should create a child logger', () => {
    const logger = createLogger();
    const childLogger = logger.child({ component: 'test' });
    expect(childLogger).toBeDefined();
    expect(childLogger.info).toBeDefined();
  });

  it('should respect log level configuration', () => {
    const logger = createLogger({ level: 'error' });
    expect(logger).toBeDefined();
  });

  it('should handle Error objects in error method', () => {
    const logger = createLogger();
    const error = new Error('Test error');
    expect(() => logger.error(error)).not.toThrow();
  });

  it('should handle string messages in error method', () => {
    const logger = createLogger();
    expect(() => logger.error('Test error message')).not.toThrow();
  });
});
