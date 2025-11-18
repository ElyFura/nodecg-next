/**
 * @nodecg/types - TypeScript type definitions for NodeCG Next
 *
 * This package contains all TypeScript interfaces and types used throughout
 * the NodeCG Next ecosystem.
 */

export * from './core';
export * from './replicant';
export * from './bundle';
export * from './user';
export * from './plugin';
export * from './asset';

// Re-export commonly used types for convenience
export type {
  NodeCGConfig,
  NodeCGServer,
  Logger,
  EventBus,
} from './core';

export type {
  Replicant,
  ReplicantOptions,
  ReplicantService,
  Unsubscribe,
} from './replicant';

export type {
  Bundle,
  BundleConfig,
  BundleManager,
} from './bundle';

export type {
  User,
  UserRole,
  AuthService,
  Session,
} from './user';

export type {
  Plugin,
  PluginManager,
} from './plugin';

export type {
  Asset,
  AssetService,
} from './asset';
