/**
 * Repository exports and factory
 * Central place to access all repositories
 */

import { PrismaClient } from '../generated/client';
import { ReplicantRepository } from './replicant.repository';
import { UserRepository } from './user.repository';
import { BundleRepository } from './bundle.repository';
import { AssetRepository } from './asset.repository';

// Export repository classes
export { ReplicantRepository } from './replicant.repository';
export { UserRepository } from './user.repository';
export { BundleRepository } from './bundle.repository';
export { AssetRepository } from './asset.repository';
export { BaseRepository } from './base.repository';

// Export types
export type {
  ReplicantCreateInput,
  ReplicantUpdateInput,
  ReplicantFindOptions,
  ReplicantHistoryEntry,
} from './replicant.repository';

export type {
  UserCreateInput,
  UserUpdateInput,
  UserFindOptions,
  SessionCreateInput,
  OAuthProviderCreateInput,
} from './user.repository';

export type {
  BundleCreateInput,
  BundleUpdateInput,
  BundleFindOptions,
  BundleConfig,
} from './bundle.repository';

export type {
  AssetCreateInput,
  AssetUpdateInput,
  AssetFindOptions,
  AssetStatistics,
} from './asset.repository';

/**
 * Repository container for dependency injection
 */
export class Repositories {
  public readonly replicant: ReplicantRepository;
  public readonly user: UserRepository;
  public readonly bundle: BundleRepository;
  public readonly asset: AssetRepository;

  constructor(prisma: PrismaClient) {
    this.replicant = new ReplicantRepository(prisma);
    this.user = new UserRepository(prisma);
    this.bundle = new BundleRepository(prisma);
    this.asset = new AssetRepository(prisma);
  }
}

/**
 * Create repository container
 * Factory function for easy initialization
 */
export function createRepositories(prisma: PrismaClient): Repositories {
  return new Repositories(prisma);
}
