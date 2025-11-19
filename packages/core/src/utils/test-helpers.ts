/**
 * Test Helper Utilities
 * Common utilities for testing
 */

import { NodeCGConfig } from '@nodecg/types';
import { EventBus, createEventBus } from './event-bus';
import { Logger, createLogger } from './logger';

/**
 * Create a test configuration
 */
export function createTestConfig(overrides: Partial<NodeCGConfig> = {}): NodeCGConfig {
  return {
    host: '127.0.0.1',
    port: 3000,
    logging: {
      level: 'error', // Suppress logs during tests
    },
    ...overrides,
  };
}

/**
 * Create a test logger that suppresses output
 */
export function createTestLogger(): Logger {
  return createLogger({ level: 'fatal' }); // Use fatal to minimize output
}

/**
 * Create a test event bus
 */
export function createTestEventBus(): EventBus {
  return createEventBus();
}

/**
 * Wait for a specific time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-undef
    setTimeout(resolve, ms);
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a spy function for testing
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(): T & {
  calls: Array<{ args: unknown[]; result?: unknown; error?: Error }>;
  callCount: number;
  reset: () => void;
  mockImplementation: (fn: T) => void;
} {
  const calls: Array<{ args: unknown[]; result?: unknown; error?: Error }> = [];
  let implementation: T | null = null;

  const spy = ((...args: unknown[]) => {
    const call: { args: unknown[]; result?: unknown; error?: Error } = { args };

    try {
      const result = implementation ? implementation(...args) : undefined;
      call.result = result;
      calls.push(call);
      return result;
    } catch (error) {
      call.error = error as Error;
      calls.push(call);
      throw error;
    }
  }) as T & {
    calls: Array<{ args: unknown[]; result?: unknown; error?: Error }>;
    callCount: number;
    reset: () => void;
    mockImplementation: (fn: T) => void;
  };

  Object.defineProperty(spy, 'calls', {
    get: () => calls,
  });

  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length,
  });

  spy.reset = () => {
    calls.length = 0;
    implementation = null;
  };

  spy.mockImplementation = (fn: T) => {
    implementation = fn;
  };

  return spy;
}

/**
 * Create a mock object with spies
 */
export function createMock<T extends Record<string, (...args: unknown[]) => unknown>>(
  methods: (keyof T)[]
): T {
  const mock = {} as T;

  for (const method of methods) {
    mock[method] = createSpy() as T[typeof method];
  }

  return mock;
}

/**
 * Generate random string
 */
export function randomString(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random number
 */
export function randomNumber(min = 0, max = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `${randomString(8)}@test.com`;
}

/**
 * Generate random CUID (compatible format)
 */
export function randomCuid(): string {
  return `c${randomString(24)}`;
}

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Assert that an error is thrown
 */
export async function assertThrows(
  fn: () => unknown | Promise<unknown>,
  errorType?: new (...args: unknown[]) => Error
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(`Expected error of type ${errorType.name}, got ${error}`);
    }
    return error as Error;
  }
}

/**
 * Capture console output
 */
export function captureConsole(): {
  log: string[];
  error: string[];
  warn: string[];
  restore: () => void;
} {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const log: string[] = [];
  const error: string[] = [];
  const warn: string[] = [];

  console.log = (...args: unknown[]) => {
    log.push(args.map(String).join(' '));
  };

  console.error = (...args: unknown[]) => {
    error.push(args.map(String).join(' '));
  };

  console.warn = (...args: unknown[]) => {
    warn.push(args.map(String).join(' '));
  };

  return {
    log,
    error,
    warn,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Create a test fixture
 */
export function createFixture<T>(defaults: T): (overrides?: Partial<T>) => T {
  return (overrides = {}) => ({
    ...defaults,
    ...overrides,
  });
}

/**
 * Run a function and measure execution time
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; time: number }> {
  // eslint-disable-next-line no-undef
  const start = performance.now();
  const result = await fn();
  // eslint-disable-next-line no-undef
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retryUntilSuccess<T>(
  fn: () => T | Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 100 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
