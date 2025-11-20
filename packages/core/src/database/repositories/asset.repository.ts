/**
 * Asset Repository
 * Handles all database operations for Assets (uploaded files)
 * SQL-only, works completely offline with local PostgreSQL
 */

import { PrismaClient, Asset } from '../generated/client';
import { BaseRepository } from './base.repository';

export interface AssetCreateInput {
  namespace: string;
  category: string;
  name: string;
  sum: string; // MD5 checksum
  url: string; // Storage URL (S3/MinIO or local)
  size: number; // File size in bytes
  mimeType: string;
}

export interface AssetUpdateInput {
  name?: string;
  sum?: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface AssetFindOptions {
  namespace?: string;
  category?: string;
  name?: string;
  mimeType?: string;
}

export interface AssetStatistics {
  totalAssets: number;
  totalSize: number; // Total size in bytes
  byNamespace: Record<string, number>;
  byCategory: Record<string, number>;
  byMimeType: Record<string, number>;
}

export class AssetRepository
  implements
    BaseRepository<
      Asset,
      AssetCreateInput,
      AssetUpdateInput,
      AssetFindOptions,
      { namespace?: string; category?: string }
    >
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Find an asset by ID
   */
  async findById(id: string): Promise<Asset | null> {
    return this.prisma.asset.findUnique({
      where: { id },
    });
  }

  /**
   * Find an asset by namespace, category, and name (most common query)
   */
  async findByNamespaceCategoryAndName(
    namespace: string,
    category: string,
    name: string
  ): Promise<Asset | null> {
    return this.prisma.asset.findUnique({
      where: {
        namespace_category_name: { namespace, category, name },
      },
    });
  }

  /**
   * Find assets by namespace
   */
  async findByNamespace(namespace: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: { namespace },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Find assets by namespace and category
   */
  async findByNamespaceAndCategory(namespace: string, category: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: { namespace, category },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find many assets with filtering
   */
  async findMany(options?: AssetFindOptions): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        ...(options?.namespace && { namespace: options.namespace }),
        ...(options?.category && { category: options.category }),
        ...(options?.name && { name: { contains: options.name } }),
        ...(options?.mimeType && { mimeType: { startsWith: options.mimeType } }),
      },
      orderBy: [{ namespace: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Find assets by MIME type pattern (e.g., 'image/', 'video/')
   */
  async findByMimeTypePattern(pattern: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        mimeType: { startsWith: pattern },
      },
      orderBy: [{ namespace: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Find image assets
   */
  async findImages(): Promise<Asset[]> {
    return this.findByMimeTypePattern('image/');
  }

  /**
   * Find video assets
   */
  async findVideos(): Promise<Asset[]> {
    return this.findByMimeTypePattern('video/');
  }

  /**
   * Find audio assets
   */
  async findAudio(): Promise<Asset[]> {
    return this.findByMimeTypePattern('audio/');
  }

  /**
   * Create a new asset
   */
  async create(data: AssetCreateInput): Promise<Asset> {
    return this.prisma.asset.create({
      data: {
        namespace: data.namespace,
        category: data.category,
        name: data.name,
        sum: data.sum,
        url: data.url,
        size: data.size,
        mimeType: data.mimeType,
      },
    });
  }

  /**
   * Update an asset
   */
  async update(id: string, data: AssetUpdateInput): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sum !== undefined && { sum: data.sum }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.size !== undefined && { size: data.size }),
        ...(data.mimeType !== undefined && { mimeType: data.mimeType }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete an asset
   */
  async delete(id: string): Promise<void> {
    await this.prisma.asset.delete({
      where: { id },
    });
  }

  /**
   * Delete asset by namespace, category, and name
   */
  async deleteByNamespaceCategoryAndName(
    namespace: string,
    category: string,
    name: string
  ): Promise<void> {
    await this.prisma.asset.delete({
      where: {
        namespace_category_name: { namespace, category, name },
      },
    });
  }

  /**
   * Delete all assets in a namespace
   */
  async deleteByNamespace(namespace: string): Promise<number> {
    const result = await this.prisma.asset.deleteMany({
      where: { namespace },
    });
    return result.count;
  }

  /**
   * Delete all assets in a namespace and category
   */
  async deleteByNamespaceAndCategory(namespace: string, category: string): Promise<number> {
    const result = await this.prisma.asset.deleteMany({
      where: { namespace, category },
    });
    return result.count;
  }

  /**
   * Count assets
   */
  async count(options?: { namespace?: string; category?: string }): Promise<number> {
    return this.prisma.asset.count({
      where: {
        ...(options?.namespace && { namespace: options.namespace }),
        ...(options?.category && { category: options.category }),
      },
    });
  }

  /**
   * Check if asset exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.asset.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if asset exists by namespace, category, and name
   */
  async existsByNamespaceCategoryAndName(
    namespace: string,
    category: string,
    name: string
  ): Promise<boolean> {
    const count = await this.prisma.asset.count({
      where: {
        namespace,
        category,
        name,
      },
    });
    return count > 0;
  }

  /**
   * Upsert an asset (create or update)
   * Useful for re-uploading assets with same name
   */
  async upsert(data: AssetCreateInput): Promise<Asset> {
    return this.prisma.asset.upsert({
      where: {
        namespace_category_name: {
          namespace: data.namespace,
          category: data.category,
          name: data.name,
        },
      },
      update: {
        sum: data.sum,
        url: data.url,
        size: data.size,
        mimeType: data.mimeType,
        updatedAt: new Date(),
      },
      create: {
        namespace: data.namespace,
        category: data.category,
        name: data.name,
        sum: data.sum,
        url: data.url,
        size: data.size,
        mimeType: data.mimeType,
      },
    });
  }

  /**
   * Find asset by checksum (for duplicate detection)
   */
  async findByChecksum(sum: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: { sum },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all namespaces (for discovery)
   */
  async getNamespaces(): Promise<string[]> {
    const result = await this.prisma.asset.findMany({
      select: { namespace: true },
      distinct: ['namespace'],
      orderBy: { namespace: 'asc' },
    });

    return result.map((r: { namespace: string }) => r.namespace);
  }

  /**
   * Get all categories for a namespace
   */
  async getCategories(namespace: string): Promise<string[]> {
    const result = await this.prisma.asset.findMany({
      where: { namespace },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return result.map((r: { category: string }) => r.category);
  }

  /**
   * Get comprehensive asset statistics
   */
  async getStatistics(): Promise<AssetStatistics> {
    const assets = await this.prisma.asset.findMany({
      select: {
        namespace: true,
        category: true,
        mimeType: true,
        size: true,
      },
    });

    const statistics: AssetStatistics = {
      totalAssets: assets.length,
      totalSize: 0,
      byNamespace: {},
      byCategory: {},
      byMimeType: {},
    };

    for (const asset of assets) {
      // Total size
      statistics.totalSize += asset.size;

      // By namespace
      statistics.byNamespace[asset.namespace] = (statistics.byNamespace[asset.namespace] || 0) + 1;

      // By category
      const categoryKey = `${asset.namespace}:${asset.category}`;
      statistics.byCategory[categoryKey] = (statistics.byCategory[categoryKey] || 0) + 1;

      // By MIME type
      const mimeBase = asset.mimeType.split('/')[0] || 'unknown';
      statistics.byMimeType[mimeBase] = (statistics.byMimeType[mimeBase] || 0) + 1;
    }

    return statistics;
  }

  /**
   * Get total storage size used
   */
  async getTotalSize(): Promise<number> {
    const result = await this.prisma.asset.aggregate({
      _sum: {
        size: true,
      },
    });

    return result._sum.size || 0;
  }

  /**
   * Get total storage size used by namespace
   */
  async getTotalSizeByNamespace(namespace: string): Promise<number> {
    const result = await this.prisma.asset.aggregate({
      where: { namespace },
      _sum: {
        size: true,
      },
    });

    return result._sum.size || 0;
  }

  /**
   * Find large assets (above size threshold in bytes)
   */
  async findLargeAssets(minSizeBytes: number, limit = 100): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        size: { gte: minSizeBytes },
      },
      orderBy: { size: 'desc' },
      take: limit,
    });
  }

  /**
   * Find recently uploaded assets
   */
  async findRecent(limit = 50): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find assets by name pattern (search)
   */
  async searchByName(query: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: {
        name: {
          contains: query,
          // SQLite LIKE is case-insensitive by default
        },
      },
      orderBy: [{ namespace: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get oldest assets (for cleanup/archival)
   */
  async findOldest(limit = 100): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Bulk delete assets by IDs
   */
  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.prisma.asset.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return result.count;
  }
}
