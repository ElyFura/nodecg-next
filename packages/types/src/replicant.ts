/**
 * Replicant type definitions for NodeCG Next
 */

import { z } from 'zod';

export interface ReplicantOptions<T = unknown> {
  /** Default value for the replicant */
  defaultValue?: T;
  /** Zod schema for validation */
  schema?: z.ZodType<T>;
  /** Enable persistence to database */
  persistent?: boolean;
  /** Enable change history tracking */
  trackHistory?: boolean;
  /** Maximum number of history entries to keep */
  historyLimit?: number;
}

export interface ReplicantMetadata {
  /** Bundle namespace */
  namespace: string;
  /** Replicant name */
  name: string;
  /** Current revision number */
  revision: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** JSON schema (if available) */
  schema?: string;
}

export interface ReplicantHistory<T = unknown> {
  /** History entry ID */
  id: string;
  /** Value at this point in history */
  value: T;
  /** User who made the change */
  changedBy?: string;
  /** When the change occurred */
  changedAt: Date;
  /** Revision number */
  revision: number;
}

export interface Replicant<T = unknown> {
  /** Current value */
  value: T;
  /** Replicant metadata */
  metadata: ReplicantMetadata;
  /** Subscribe to value changes */
  on(event: 'change', handler: (newValue: T, oldValue: T) => void): () => void;
  /** Get change history */
  getHistory(limit?: number): Promise<ReplicantHistory<T>[]>;
  /** Validate a value against the schema */
  validate(value: T): boolean;
}

export type Unsubscribe = () => void;

export interface ReplicantService {
  register<T>(namespace: string, name: string, options: ReplicantOptions<T>): Promise<Replicant<T>>;
  get<T>(namespace: string, name: string): Promise<Replicant<T> | null>;
  set<T>(namespace: string, name: string, value: T): Promise<void>;
  delete(namespace: string, name: string): Promise<void>;
  subscribe<T>(namespace: string, name: string, callback: (value: T) => void): Unsubscribe;
  getAll(namespace: string): Promise<ReplicantMetadata[]>;
}
