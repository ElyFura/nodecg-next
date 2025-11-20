/**
 * User Repository
 * Handles all database operations for Users, Roles, and Permissions
 */

import { PrismaClient, User, Role, Permission } from '../generated/client/index.js';
import { BaseRepository } from './base.repository.js';

export interface UserCreateInput {
  username: string;
  email?: string;
  password?: string; // Pre-hashed
  roleId?: string;
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string; // Pre-hashed
  roleId?: string;
}

export interface UserFindOptions {
  username?: string;
  email?: string;
  roleId?: string;
  includeRole?: boolean;
  includeProviders?: boolean;
}

export class UserRepository
  implements
    BaseRepository<User, UserCreateInput, UserUpdateInput, UserFindOptions, { username?: string }>
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        providers: true,
      },
    });
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
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
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        providers: true,
      },
    });
  }

  /**
   * Find users with optional filters
   */
  async find(options: UserFindOptions = {}): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        username: options.username,
        email: options.email,
        roleId: options.roleId,
      },
      include: {
        role: options.includeRole
          ? {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            }
          : false,
        providers: options.includeProviders,
      },
    });
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        role: true,
        providers: true,
      },
    });
  }

  /**
   * Create a new user
   */
  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
      include: {
        role: true,
        providers: true,
      },
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        providers: true,
      },
    });
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Count users with optional filters
   */
  async count(filter?: { roleId?: string }): Promise<number> {
    return this.prisma.user.count({
      where: filter,
    });
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username },
    });
    return count > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }
}

/**
 * Role Repository
 */
export class RoleRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async create(data: { name: string; displayName: string; description?: string }): Promise<Role> {
    return this.prisma.role.create({
      data,
    });
  }

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });
  }
}

/**
 * Permission Repository
 */
export class PermissionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany();
  }

  async create(data: {
    name: string;
    resource: string;
    action: string;
    description?: string;
  }): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { resource },
    });
  }
}

/**
 * Session Repository
 */
export interface SessionCreateInput {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async findActiveSessionByToken(token: string): Promise<any> {
    return this.prisma.session.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(data: SessionCreateInput): Promise<any> {
    return this.prisma.session.create({
      data,
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}

/**
 * OAuth Provider Repository
 */
export interface OAuthProviderCreateInput {
  userId: string;
  provider: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class OAuthProviderRepository {
  constructor(private prisma: PrismaClient) {}

  async findByProviderAndId(provider: string, providerId: string): Promise<any> {
    return this.prisma.oAuthProvider.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async create(data: OAuthProviderCreateInput): Promise<any> {
    return this.prisma.oAuthProvider.create({
      data,
    });
  }

  async updateTokens(
    id: string,
    data: { accessToken?: string; refreshToken?: string; expiresAt?: Date }
  ): Promise<any> {
    return this.prisma.oAuthProvider.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.oAuthProvider.delete({
      where: { id },
    });
  }
}
