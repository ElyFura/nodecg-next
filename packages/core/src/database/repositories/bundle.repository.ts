/**
 * Bundle Repository
 * Handles all database operations for Bundles (NodeCG plugins/packages)
 * SQL-only, works completely offline with local PostgreSQL
 */

import { PrismaClient, Bundle } from '../generated/client';
import { BaseRepository } from './base.repository';

export interface BundleCreateInput {
  name: string;
  version: string;
  config: string; // JSON string containing bundle configuration
  enabled?: boolean;
}

export interface BundleUpdateInput {
  version?: string;
  config?: string;
  enabled?: boolean;
}

export interface BundleFindOptions {
  name?: string;
  enabled?: boolean;
  version?: string;
}

export interface BundleConfig {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  nodecg?: {
    compatibleRange?: string;
    dashboardPanels?: Array<{
      name: string;
      title: string;
      width: number;
      file: string;
    }>;
    graphics?: Array<{
      file: string;
      width: number;
      height: number;
    }>;
    mount?: Array<{
      directory: string;
      endpoint: string;
    }>;
    assetCategories?: Array<{
      name: string;
      title: string;
      allowedTypes: string[];
    }>;
  };
  dependencies?: Record<string, string>;
  [key: string]: unknown; // Allow additional properties
}

export class BundleRepository
  implements
    BaseRepository<
      Bundle,
      BundleCreateInput,
      BundleUpdateInput,
      BundleFindOptions,
      { enabled?: boolean }
    >
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Find a bundle by ID
   */
  async findById(id: string): Promise<Bundle | null> {
    return this.prisma.bundle.findUnique({
      where: { id },
    });
  }

  /**
   * Find a bundle by name (most common query)
   */
  async findByName(name: string): Promise<Bundle | null> {
    return this.prisma.bundle.findUnique({
      where: { name },
    });
  }

  /**
   * Find many bundles with filtering
   */
  async findMany(options?: BundleFindOptions): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      where: {
        ...(options?.name && { name: options.name }),
        ...(options?.enabled !== undefined && { enabled: options.enabled }),
        ...(options?.version && { version: options.version }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find all enabled bundles
   */
  async findEnabled(): Promise<Bundle[]> {
    return this.findMany({ enabled: true });
  }

  /**
   * Find all disabled bundles
   */
  async findDisabled(): Promise<Bundle[]> {
    return this.findMany({ enabled: false });
  }

  /**
   * Create a new bundle
   */
  async create(data: BundleCreateInput): Promise<Bundle> {
    return this.prisma.bundle.create({
      data: {
        name: data.name,
        version: data.version,
        config: data.config,
        enabled: data.enabled ?? true,
      },
    });
  }

  /**
   * Update a bundle
   */
  async update(id: string, data: BundleUpdateInput): Promise<Bundle> {
    return this.prisma.bundle.update({
      where: { id },
      data: {
        ...(data.version !== undefined && { version: data.version }),
        ...(data.config !== undefined && { config: data.config }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update bundle by name
   */
  async updateByName(name: string, data: BundleUpdateInput): Promise<Bundle> {
    return this.prisma.bundle.update({
      where: { name },
      data: {
        ...(data.version !== undefined && { version: data.version }),
        ...(data.config !== undefined && { config: data.config }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a bundle
   */
  async delete(id: string): Promise<void> {
    await this.prisma.bundle.delete({
      where: { id },
    });
  }

  /**
   * Delete bundle by name
   */
  async deleteByName(name: string): Promise<void> {
    await this.prisma.bundle.delete({
      where: { name },
    });
  }

  /**
   * Count bundles
   */
  async count(options?: { enabled?: boolean }): Promise<number> {
    return this.prisma.bundle.count({
      where: options?.enabled !== undefined ? { enabled: options.enabled } : undefined,
    });
  }

  /**
   * Check if bundle exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.bundle.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if bundle exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.bundle.count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Enable a bundle
   */
  async enable(id: string): Promise<Bundle> {
    return this.update(id, { enabled: true });
  }

  /**
   * Enable bundle by name
   */
  async enableByName(name: string): Promise<Bundle> {
    return this.updateByName(name, { enabled: true });
  }

  /**
   * Disable a bundle
   */
  async disable(id: string): Promise<Bundle> {
    return this.update(id, { enabled: false });
  }

  /**
   * Disable bundle by name
   */
  async disableByName(name: string): Promise<Bundle> {
    return this.updateByName(name, { enabled: false });
  }

  /**
   * Upsert a bundle (create or update)
   * Useful for bundle discovery and registration
   */
  async upsert(data: BundleCreateInput): Promise<Bundle> {
    return this.prisma.bundle.upsert({
      where: { name: data.name },
      update: {
        version: data.version,
        config: data.config,
        enabled: data.enabled ?? true,
        updatedAt: new Date(),
      },
      create: {
        name: data.name,
        version: data.version,
        config: data.config,
        enabled: data.enabled ?? true,
      },
    });
  }

  /**
   * Get bundle configuration (parsed)
   */
  async getConfig(id: string): Promise<BundleConfig | null> {
    const bundle = await this.findById(id);
    if (!bundle) {
      return null;
    }

    try {
      return JSON.parse(bundle.config) as BundleConfig;
    } catch (error) {
      throw new Error(`Failed to parse bundle config for ${bundle.name}: ${error}`);
    }
  }

  /**
   * Get bundle configuration by name
   */
  async getConfigByName(name: string): Promise<BundleConfig | null> {
    const bundle = await this.findByName(name);
    if (!bundle) {
      return null;
    }

    try {
      return JSON.parse(bundle.config) as BundleConfig;
    } catch (error) {
      throw new Error(`Failed to parse bundle config for ${bundle.name}: ${error}`);
    }
  }

  /**
   * Update bundle configuration
   */
  async updateConfig(id: string, config: BundleConfig): Promise<Bundle> {
    return this.update(id, { config: JSON.stringify(config) });
  }

  /**
   * Update bundle configuration by name
   */
  async updateConfigByName(name: string, config: BundleConfig): Promise<Bundle> {
    return this.updateByName(name, { config: JSON.stringify(config) });
  }

  /**
   * Get bundle statistics
   */
  async getStatistics(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
  }> {
    const [total, enabled] = await Promise.all([this.count(), this.count({ enabled: true })]);

    return {
      total,
      enabled,
      disabled: total - enabled,
    };
  }

  /**
   * Get bundles by version pattern (for compatibility checks)
   */
  async findByVersionPattern(pattern: string): Promise<Bundle[]> {
    // Use SQL LIKE for pattern matching
    // This is PostgreSQL-specific but works offline
    return this.prisma.$queryRaw`
      SELECT * FROM "Bundle"
      WHERE version LIKE ${pattern}
      ORDER BY name ASC
    `;
  }

  /**
   * Get all bundle names (for discovery)
   */
  async getAllNames(): Promise<string[]> {
    const bundles = await this.prisma.bundle.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return bundles.map((b: { name: string }) => b.name);
  }

  /**
   * Bulk enable/disable bundles
   */
  async bulkUpdateEnabled(names: string[], enabled: boolean): Promise<number> {
    const result = await this.prisma.bundle.updateMany({
      where: {
        name: { in: names },
      },
      data: {
        enabled,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get bundles sorted by update date
   */
  async findRecentlyUpdated(limit = 10): Promise<Bundle[]> {
    return this.prisma.bundle.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }
}
