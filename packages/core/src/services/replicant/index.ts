/**
 * Replicant Service Exports
 *
 * Type-safe, validated, synchronized state management for NodeCG
 */

export {
  ReplicantService,
  type ReplicantOptions,
  type ReplicantChangeEvent,
  type ReplicantMeta,
} from './service';

export { type ReplicantSyncMessage, type ReplicantSyncType, SyncManager } from './sync-manager';
