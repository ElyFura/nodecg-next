/**
 * Error Handling Utilities
 * Provides custom error classes and error handling helpers
 */

/**
 * Base error class for all NodeCG errors
 */
export class NodeCGError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'NodeCGError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends NodeCGError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends NodeCGError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends NodeCGError {
  constructor(resource: string, identifier?: string) {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends NodeCGError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends NodeCGError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 'INTERNAL_ERROR', 500, details);
    this.name = 'InternalError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Replicant error
 */
export class ReplicantError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'REPLICANT_ERROR', 500, details);
    this.name = 'ReplicantError';
  }
}

/**
 * Bundle error
 */
export class BundleError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUNDLE_ERROR', 500, details);
    this.name = 'BundleError';
  }
}

/**
 * Asset error
 */
export class AssetError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'ASSET_ERROR', 500, details);
    this.name = 'AssetError';
  }
}

/**
 * WebSocket error
 */
export class WebSocketError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'WEBSOCKET_ERROR', 500, details);
    this.name = 'WebSocketError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends NodeCGError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Check if error is a NodeCG error
 */
export function isNodeCGError(error: unknown): error is NodeCGError {
  return error instanceof NodeCGError;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
  };
} {
  if (isNodeCGError(error)) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };
  }

  return {
    error: {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    },
  };
}

/**
 * Wrap async function with error handling
 */
export function wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      if (isNodeCGError(error)) {
        throw error;
      }
      throw new InternalError('Unexpected error occurred', { originalError: error });
    }
  };
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: unknown,
  message: string,
  ErrorClass = ValidationError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert value is not null/undefined
 */
export function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
}

/**
 * Try to execute function and return result or error
 */
export function tryExecute<T>(
  fn: () => T
): { success: true; data: T } | { success: false; error: Error } {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Try to execute async function and return result or error
 */
export async function tryExecuteAsync<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = 2, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoff, attempt - 1);
        onRetry?.(attempt, lastError);
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new InternalError('Retry failed without error');
}

/**
 * Create error with cause chain
 */
export function createError(
  message: string,
  cause?: Error,
  ErrorClass: typeof NodeCGError = NodeCGError
): NodeCGError {
  const error = new ErrorClass(message, ErrorClass.name, 500, { cause });
  if (cause) {
    error.stack = `${error.stack}\nCaused by: ${cause.stack}`;
  }
  return error;
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Get error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (isNodeCGError(error)) {
    // NodeCG errors are generally operational
    return error.statusCode < 500;
  }
  return false;
}

/**
 * Log error with appropriate level
 */
export function logError(
  error: unknown,
  logger: {
    error: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
  }
): void {
  if (isOperationalError(error)) {
    logger.warn(getErrorMessage(error));
  } else {
    logger.error(getErrorMessage(error), { stack: getErrorStack(error) });
  }
}
