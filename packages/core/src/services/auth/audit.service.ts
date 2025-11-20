/**
 * Audit Logging Service
 * Tracks all critical operations for security and compliance
 */

import type { Logger } from '@nodecg/types';
import { createLogger } from '../../utils/logger.js';
import { PrismaClient } from '../../database/generated/client/index.js';

const logger = createLogger({ level: 'info' });

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Service
 * Logs all security-relevant operations
 */
export class AuditService {
  private prisma: PrismaClient;
  private logger: Logger;
  private retentionDays: number;

  constructor(prisma: PrismaClient, customLogger?: Logger, retentionDays = 90) {
    this.prisma = prisma;
    this.logger = customLogger || logger;
    this.retentionDays = retentionDays;
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });

      this.logger.debug(
        `Audit log: ${entry.action} on ${entry.resource} by ${entry.userId || 'anonymous'}`
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery = {}) {
    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = {
        contains: query.action,
      };
    }

    if (query.resource) {
      where.resource = {
        contains: query.resource,
      };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      limit: query.limit || 100,
      offset: query.offset || 0,
    };
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'register' | 'password-change',
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth:${action}`,
      resource: 'user',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log replicant operations
   */
  async logReplicant(
    action: 'create' | 'update' | 'delete',
    namespace: string,
    name: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action: `replicant:${action}`,
      resource: `${namespace}:${name}`,
      metadata,
    });
  }

  /**
   * Log bundle operations
   */
  async logBundle(
    action: 'load' | 'unload' | 'enable' | 'disable' | 'install' | 'uninstall',
    bundleName: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action: `bundle:${action}`,
      resource: bundleName,
      metadata,
    });
  }

  /**
   * Log user management operations
   */
  async logUserManagement(
    action: 'create' | 'update' | 'delete' | 'role-change',
    targetUserId: string,
    performedBy?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId: performedBy,
      action: `user:${action}`,
      resource: targetUserId,
      metadata,
    });
  }

  /**
   * Log asset operations
   */
  async logAsset(
    action: 'upload' | 'delete' | 'update',
    assetId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action: `asset:${action}`,
      resource: assetId,
      metadata,
    });
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.info(`Cleaned up ${result.count} audit logs older than ${this.retentionDays} days`);
    return result.count;
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      total,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byUser: byUser.map((item) => ({
        userId: item.userId,
        count: item._count,
      })),
    };
  }
}
