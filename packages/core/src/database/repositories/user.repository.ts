/**
 * User Repository
 * Handles all database operations for Users, Sessions, and OAuth Providers
 * SQL-only, works completely offline with local PostgreSQL
 */

import { PrismaClient, User, Session, OAuthProvider, UserRole } from '../generated/client';
import { BaseRepository } from './base.repository';

export interface UserCreateInput {
  username: string;
  email?: string;
  password?: string; // Hashed password
  role?: UserRole;
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string; // Hashed password
  role?: UserRole;
}

export interface UserFindOptions {
  username?: string;
  email?: string;
  role?: UserRole;
  includeSessions?: boolean;
  includeProviders?: boolean;
}

export interface SessionCreateInput {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface OAuthProviderCreateInput {
  userId: string;
  provider: string; // 'twitch', 'discord', 'google', etc.
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class UserRepository
  implements BaseRepository<User, UserCreateInput, UserUpdateInput>
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { expiresAt: { gt: new Date() } }, // Only active sessions
          orderBy: { createdAt: 'desc' },
        },
        providers: true,
      },
    });
  }

  /**
   * Find a user by username (common for login)
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
        providers: true,
      },
    });
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
        providers: true,
      },
    });
  }

  /**
   * Find many users with filtering
   */
  async findMany(options?: UserFindOptions): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        ...(options?.username && { username: options.username }),
        ...(options?.email && { email: options.email }),
        ...(options?.role && { role: options.role }),
      },
      include: {
        ...(options?.includeSessions && {
          sessions: {
            where: { expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
          },
        }),
        ...(options?.includeProviders && { providers: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all admins
   */
  async findAdmins(): Promise<User[]> {
    return this.findMany({ role: UserRole.ADMIN });
  }

  /**
   * Create a new user
   */
  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role || UserRole.VIEWER,
      },
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.password !== undefined && { password: data.password }),
        ...(data.role !== undefined && { role: data.role }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a user (cascade deletes sessions and providers)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Count users
   */
  async count(options?: { role?: UserRole }): Promise<number> {
    return this.prisma.user.count({
      where: options?.role ? { role: options.role } : undefined,
    });
  }

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if username exists (for registration validation)
   */
  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username },
    });
    return count > 0;
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Create a new session
   */
  async createSession(data: SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Find session by token
   */
  async findSessionByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Find active session by token (not expired)
   */
  async findActiveSessionByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  /**
   * Get all sessions for a user
   */
  async findUserSessions(userId: string, activeOnly = true): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        ...(activeOnly && { expiresAt: { gt: new Date() } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    await this.prisma.session.delete({
      where: { token },
    });
  }

  /**
   * Delete all sessions for a user (logout all devices)
   */
  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  /**
   * Delete expired sessions (cleanup task)
   */
  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  // ==================== OAUTH PROVIDER MANAGEMENT ====================

  /**
   * Create or update OAuth provider for user
   */
  async upsertOAuthProvider(data: OAuthProviderCreateInput): Promise<OAuthProvider> {
    return this.prisma.oAuthProvider.upsert({
      where: {
        provider_providerId: {
          provider: data.provider,
          providerId: data.providerId,
        },
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find user by OAuth provider
   */
  async findByOAuthProvider(
    provider: string,
    providerId: string
  ): Promise<User | null> {
    const oauthProvider = await this.prisma.oAuthProvider.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
      include: { user: true },
    });

    return oauthProvider?.user || null;
  }

  /**
   * Get OAuth providers for a user
   */
  async findUserOAuthProviders(userId: string): Promise<OAuthProvider[]> {
    return this.prisma.oAuthProvider.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete OAuth provider
   */
  async deleteOAuthProvider(provider: string, providerId: string): Promise<void> {
    await this.prisma.oAuthProvider.delete({
      where: {
        provider_providerId: { provider, providerId },
      },
    });
  }

  /**
   * Delete all OAuth providers for a user
   */
  async deleteUserOAuthProviders(userId: string): Promise<number> {
    const result = await this.prisma.oAuthProvider.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Change user role
   */
  async changeRole(userId: string, role: UserRole): Promise<User> {
    return this.update(userId, { role });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return this.update(userId, { password: hashedPassword });
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    admins: number;
    operators: number;
    viewers: number;
    withOAuth: number;
  }> {
    const [total, admins, operators, viewers, usersWithProviders] = await Promise.all([
      this.count(),
      this.count({ role: UserRole.ADMIN }),
      this.count({ role: UserRole.OPERATOR }),
      this.count({ role: UserRole.VIEWER }),
      this.prisma.user.count({
        where: {
          providers: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      admins,
      operators,
      viewers,
      withOAuth: usersWithProviders,
    };
  }
}
