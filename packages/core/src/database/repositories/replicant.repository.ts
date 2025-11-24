/**
 * Replicant Repository
 * Handles all database operations for Replicants and their history
 * SQL-only, works completely offline with local PostgreSQL
 */

import { PrismaClient, Replicant } from '../generated/client';
import { BaseRepository } from './base.repository';

export interface ReplicantCreateInput {
  namespace: string;
  name: string;
  value: string; // JSON string
  schema?: string; // JSON Schema string
}

export interface ReplicantUpdateInput {
  value?: string;
  schema?: string;
  revision?: number;
}

export interface ReplicantFindOptions {
  namespace?: string;
  name?: string;
  includeHistory?: boolean;
}

export interface ReplicantHistoryEntry {
  id: string;
  value: string;
  changedBy: string | null;
  changedAt: Date;
}

export class ReplicantRepository
  implements
    BaseRepository<
      Replicant,
      ReplicantCreateInput,
      ReplicantUpdateInput,
      ReplicantFindOptions,
      { namespace?: string }
    >
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Find a replicant by ID
   */
  async findById(id: string): Promise<Replicant | null> {
    return this.prisma.replicant.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { changedAt: 'desc' },
          take: 10, // Last 10 changes
        },
      },
    });
  }

  /**
   * Find a replicant by namespace and name (most common query)
   */
  async findByNamespaceAndName(
    namespace: string,
    name: string,
    includeHistory = false
  ): Promise<Replicant | null> {
    return this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name },
      },
      include: includeHistory
        ? {
            history: {
              orderBy: { changedAt: 'desc' },
              take: 10,
            },
          }
        : undefined,
    });
  }

  /**
   * Find all replicants for a namespace
   */
  async findByNamespace(namespace: string): Promise<Replicant[]> {
    return this.prisma.replicant.findMany({
      where: { namespace },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find many replicants with filtering
   */
  async findMany(options?: ReplicantFindOptions): Promise<Replicant[]> {
    return this.prisma.replicant.findMany({
      where: {
        ...(options?.namespace && { namespace: options.namespace }),
        ...(options?.name && { name: options.name }),
      },
      include: options?.includeHistory
        ? {
            history: {
              orderBy: { changedAt: 'desc' },
              take: 10,
            },
          }
        : undefined,
      orderBy: [{ namespace: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Create a new replicant
   */
  async create(data: ReplicantCreateInput): Promise<Replicant> {
    return this.prisma.replicant.create({
      data: {
        namespace: data.namespace,
        name: data.name,
        value: data.value,
        schema: data.schema,
        revision: 0,
      },
    });
  }

  /**
   * Update a replicant and create history entry
   */
  async update(id: string, data: ReplicantUpdateInput): Promise<Replicant> {
    // Get current replicant to save to history
    const current = await this.prisma.replicant.findUnique({
      where: { id },
    });

    if (!current) {
      throw new Error(`Replicant with id ${id} not found`);
    }

    // Update replicant and create history entry in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create history entry with old value
      await tx.replicantHistory.create({
        data: {
          replicantId: id,
          value: current.value,
          revision: current.revision,
          changedBy: data.revision !== undefined ? 'system' : null,
          changedAt: new Date(),
        },
      });

      // Update replicant
      return tx.replicant.update({
        where: { id },
        data: {
          ...(data.value !== undefined && { value: data.value }),
          ...(data.schema !== undefined && { schema: data.schema }),
          revision: current.revision + 1,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Update replicant by namespace and name
   */
  async updateByNamespaceAndName(
    namespace: string,
    name: string,
    value: string,
    changedBy?: string
  ): Promise<Replicant> {
    const replicant = await this.findByNamespaceAndName(namespace, name);
    if (!replicant) {
      throw new Error(`Replicant ${namespace}:${name} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create history entry
      await tx.replicantHistory.create({
        data: {
          replicantId: replicant.id,
          value: replicant.value,
          revision: replicant.revision,
          changedBy: changedBy || null,
          changedAt: new Date(),
        },
      });

      // Update replicant
      return tx.replicant.update({
        where: { id: replicant.id },
        data: {
          value,
          revision: replicant.revision + 1,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Delete a replicant (cascade deletes history)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.replicant.delete({
      where: { id },
    });
  }

  /**
   * Delete by namespace and name
   */
  async deleteByNamespaceAndName(namespace: string, name: string): Promise<void> {
    await this.prisma.replicant.delete({
      where: {
        namespace_name: { namespace, name },
      },
    });
  }

  /**
   * Count replicants
   */
  async count(options?: { namespace?: string }): Promise<number> {
    return this.prisma.replicant.count({
      where: options?.namespace ? { namespace: options.namespace } : undefined,
    });
  }

  /**
   * Check if replicant exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.replicant.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if replicant exists by namespace and name
   */
  async existsByNamespaceAndName(namespace: string, name: string): Promise<boolean> {
    const count = await this.prisma.replicant.count({
      where: {
        namespace,
        name,
      },
    });
    return count > 0;
  }

  /**
   * Get replicant history
   */
  async getHistory(id: string, limit = 50): Promise<ReplicantHistoryEntry[]> {
    return this.prisma.replicantHistory.findMany({
      where: { replicantId: id },
      orderBy: { changedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        value: true,
        changedBy: true,
        changedAt: true,
      },
    });
  }

  /**
   * Get history by namespace and name
   */
  async getHistoryByNamespaceAndName(
    namespace: string,
    name: string,
    limit = 50
  ): Promise<ReplicantHistoryEntry[]> {
    const replicant = await this.findByNamespaceAndName(namespace, name);
    if (!replicant) {
      throw new Error(`Replicant ${namespace}:${name} not found`);
    }

    return this.getHistory(replicant.id, limit);
  }

  /**
   * Delete old history entries (cleanup)
   * Keeps the most recent N entries per replicant
   */
  async pruneHistory(keepCount = 100): Promise<number> {
    // Get all replicants
    const replicants = await this.prisma.replicant.findMany({
      select: { id: true },
    });

    let totalDeleted = 0;

    // For each replicant, delete old history
    for (const replicant of replicants) {
      const history = await this.prisma.replicantHistory.findMany({
        where: { replicantId: replicant.id },
        orderBy: { changedAt: 'desc' },
        select: { id: true },
        skip: keepCount,
      });

      if (history.length > 0) {
        const { count } = await this.prisma.replicantHistory.deleteMany({
          where: {
            id: { in: history.map((h: { id: string }) => h.id) },
          },
        });
        totalDeleted += count;
      }
    }

    return totalDeleted;
  }

  /**
   * Get all namespaces (for discovery)
   */
  async getNamespaces(): Promise<string[]> {
    const result = await this.prisma.replicant.findMany({
      select: { namespace: true },
      distinct: ['namespace'],
      orderBy: { namespace: 'asc' },
    });

    return result.map((r: { namespace: string }) => r.namespace);
  }

  /**
   * Get replicant names for a namespace
   */
  async getReplicantNames(namespace: string): Promise<string[]> {
    const result = await this.prisma.replicant.findMany({
      where: { namespace },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return result.map((r: { name: string }) => r.name);
  }
}
