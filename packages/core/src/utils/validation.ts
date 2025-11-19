/**
 * Validation Utilities
 * Common validation patterns using Zod
 */

import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from './errors';

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * ID validation (CUID format)
   */
  id: z.string().cuid(),

  /**
   * UUID validation
   */
  uuid: z.string().uuid(),

  /**
   * Email validation
   */
  email: z.string().email(),

  /**
   * URL validation
   */
  url: z.string().url(),

  /**
   * Namespace validation (alphanumeric with dashes)
   */
  namespace: z.string().regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with dashes'),

  /**
   * Username validation
   */
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Must be alphanumeric with underscores or dashes'),

  /**
   * Password validation
   */
  password: z.string().min(8).max(100),

  /**
   * JSON string validation
   */
  jsonString: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Must be valid JSON string' }
  ),

  /**
   * Pagination offset
   */
  offset: z.number().int().min(0).default(0),

  /**
   * Pagination limit
   */
  limit: z.number().int().min(1).max(100).default(20),

  /**
   * Date string (ISO 8601)
   */
  dateString: z.string().datetime(),

  /**
   * Positive integer
   */
  positiveInt: z.number().int().positive(),

  /**
   * Non-negative integer
   */
  nonNegativeInt: z.number().int().min(0),

  /**
   * Boolean string (converts "true"/"false" strings)
   */
  booleanString: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .or(z.boolean()),

  /**
   * Hex color code
   */
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be valid hex color'),

  /**
   * Semantic version
   */
  semver: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/, 'Must be valid semver'),

  /**
   * Port number
   */
  port: z.number().int().min(1).max(65535),

  /**
   * IP address (v4 or v6)
   */
  ip: z.string().ip(),

  /**
   * Hostname
   */
  hostname: z
    .string()
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      'Must be valid hostname'
    ),
};

/**
 * Validate data against a schema
 * Throws ValidationError if validation fails
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      throw new ValidationError('Validation failed', { errors });
    }
    throw error;
  }
}

/**
 * Validate data and return result object (doesn't throw)
 */
export function validateSafe<T>(
  schema: ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; errors: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Create a validator function from a schema
 */
export function createValidator<T>(schema: ZodSchema<T>) {
  return (data: unknown): T => validate(schema, data);
}

/**
 * Create a safe validator function from a schema
 */
export function createSafeValidator<T>(schema: ZodSchema<T>) {
  return (data: unknown) => validateSafe(schema, data);
}

/**
 * Validate partial data (all fields optional)
 */
export function validatePartial<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  data: unknown
): z.infer<ReturnType<T['partial']>> {
  return validate(schema.partial(), data);
}

/**
 * Validate and coerce types
 */
export function validateWithCoercion<T>(schema: ZodSchema<T>, data: unknown): T {
  // Common coercions
  const coercionSchema = z.preprocess((val) => {
    // Convert string numbers to numbers
    if (typeof val === 'string' && !isNaN(Number(val))) {
      return Number(val);
    }
    // Convert string booleans to booleans
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, schema) as ZodSchema<T>;

  return validate(coercionSchema, data);
}

/**
 * Create an object validator with common patterns
 */
export function createObjectValidator<T extends z.ZodRawShape>(shape: T) {
  const schema = z.object(shape);

  return {
    /**
     * Validate required fields
     */
    validate: (data: unknown) => validate(schema, data),

    /**
     * Validate with all fields optional
     */
    validatePartial: (data: unknown) => validate(schema.partial(), data),

    /**
     * Validate only specific fields
     */
    validatePick: <K extends keyof T>(keys: K[], data: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picked = Object.fromEntries(keys.map((k) => [k, true])) as any;
      return validate(schema.pick(picked), data);
    },

    /**
     * Validate excluding specific fields
     */
    validateOmit: <K extends keyof T>(keys: K[], data: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const omitted = Object.fromEntries(keys.map((k) => [k, true])) as any;
      return validate(schema.omit(omitted), data);
    },

    /**
     * Safe validation
     */
    validateSafe: (data: unknown) => validateSafe(schema, data),

    /**
     * Get the schema
     */
    getSchema: () => schema,
  };
}

/**
 * Array validation helpers
 */
export const ArrayValidation = {
  /**
   * Validate array with min/max length
   */
  withLength: <T>(schema: ZodSchema<T>, min?: number, max?: number) => {
    let arraySchema = z.array(schema);
    if (min !== undefined) arraySchema = arraySchema.min(min);
    if (max !== undefined) arraySchema = arraySchema.max(max);
    return arraySchema;
  },

  /**
   * Validate non-empty array
   */
  nonEmpty: <T>(schema: ZodSchema<T>) => z.array(schema).nonempty(),

  /**
   * Validate array with unique items
   */
  unique: <T>(schema: ZodSchema<T>) =>
    z.array(schema).refine((arr) => new Set(arr).size === arr.length, {
      message: 'Array must contain unique items',
    }),
};

/**
 * String validation helpers
 */
export const StringValidation = {
  /**
   * Trim whitespace before validation
   */
  trim: (schema: z.ZodString) =>
    z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), schema),

  /**
   * Convert to lowercase before validation
   */
  lowercase: (schema: z.ZodString) =>
    z.preprocess((val) => (typeof val === 'string' ? val.toLowerCase() : val), schema),

  /**
   * Convert to uppercase before validation
   */
  uppercase: (schema: z.ZodString) =>
    z.preprocess((val) => (typeof val === 'string' ? val.toUpperCase() : val), schema),

  /**
   * Non-empty string
   */
  nonEmpty: () => z.string().min(1, 'String cannot be empty'),

  /**
   * Alphanumeric only
   */
  alphanumeric: () => z.string().regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
};

/**
 * Number validation helpers
 */
export const NumberValidation = {
  /**
   * Integer in range
   */
  intInRange: (min: number, max: number) => z.number().int().min(min).max(max),

  /**
   * Positive number
   */
  positive: () => z.number().positive(),

  /**
   * Non-negative number
   */
  nonNegative: () => z.number().min(0),

  /**
   * Percentage (0-100)
   */
  percentage: () => z.number().min(0).max(100),

  /**
   * Parse number from string
   */
  fromString: () =>
    z
      .string()
      .transform((val) => Number(val))
      .pipe(z.number()),
};

/**
 * Format validation errors for display
 */
export function formatValidationErrors(error: ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Extract error messages from validation error
 */
export function getValidationMessages(error: ZodError): Record<string, string> {
  const messages: Record<string, string> = {};

  for (const err of error.errors) {
    const path = err.path.join('.');
    messages[path] = err.message;
  }

  return messages;
}
