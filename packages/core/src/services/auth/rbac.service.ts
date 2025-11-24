/**
 * RBAC (Role-Based Access Control) Service
 * Handles permission checking and authorization
 */

/* global setTimeout */
import type { Logger } from '@nodecg/types';
import { createLogger } from '../../utils/logger.js';
import type {
  UserRepository,
  RoleRepository,
  PermissionRepository,
} from '../../database/repositories/index.js';

const logger = createLogger({ level: 'info' });

export interface PermissionCheck {
  resource: string;
  action: string;
}

/**
 * RBAC Service
 * Manages role-based access control and permissions
 */
export class RBACService {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;
  private permissionRepository: PermissionRepository;
  private log: Logger;

  // Cache for permission checks (user:permission -> boolean)
  private permissionCache = new Map<string, boolean>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(
    userRepository: UserRepository,
    roleRepository: RoleRepository,
    permissionRepository: PermissionRepository,
    customLogger?: Logger
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
    this.log = customLogger || logger;
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const cacheKey = `${userId}:${resource}:${action}`;

    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Get user with role and permissions
    const user = (await this.userRepository.findById(userId)) as any;
    if (!user || !user.role) {
      return false;
    }

    // Check if user's role has the required permission
    const hasPermission = user.role.permissions.some((rp: any) => {
      const perm = rp.permission;
      return (
        perm.resource === resource && (perm.action === action || perm.action === 'manage') // 'manage' grants all actions
      );
    });

    // Cache the result
    this.permissionCache.set(cacheKey, hasPermission);
    setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheExpiry);

    return hasPermission;
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: PermissionCheck[]): Promise<boolean> {
    for (const perm of permissions) {
      if (await this.hasPermission(userId, perm.resource, perm.action)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: PermissionCheck[]): Promise<boolean> {
    for (const perm of permissions) {
      if (!(await this.hasPermission(userId, perm.resource, perm.action))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = (await this.userRepository.findById(userId)) as any;
    if (!user || !user.role) {
      return [];
    }

    return user.role.permissions.map(
      (rp: any) => `${rp.permission.resource}:${rp.permission.action}`
    );
  }

  /**
   * Check if a user has a specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const user = (await this.userRepository.findById(userId)) as any;
    if (!user || !user.role) {
      return false;
    }

    return user.role.name === roleName;
  }

  /**
   * Check if a user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.userRepository.update(userId, { roleId });
    this.clearUserCache(userId);
    this.log.info(`Role assigned to user ${userId}: ${roleId}`);
  }

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaultRolesAndPermissions(): Promise<void> {
    // Define default permissions
    const defaultPermissions = [
      // Replicant permissions
      {
        name: 'replicant:read',
        resource: 'replicant',
        action: 'read',
        description: 'Read replicants',
      },
      {
        name: 'replicant:write',
        resource: 'replicant',
        action: 'write',
        description: 'Write replicants',
      },
      {
        name: 'replicant:delete',
        resource: 'replicant',
        action: 'delete',
        description: 'Delete replicants',
      },
      {
        name: 'replicant:manage',
        resource: 'replicant',
        action: 'manage',
        description: 'Manage all replicants',
      },

      // Bundle permissions
      { name: 'bundle:read', resource: 'bundle', action: 'read', description: 'View bundles' },
      {
        name: 'bundle:write',
        resource: 'bundle',
        action: 'write',
        description: 'Upload/modify bundles',
      },
      {
        name: 'bundle:delete',
        resource: 'bundle',
        action: 'delete',
        description: 'Delete bundles',
      },
      {
        name: 'bundle:manage',
        resource: 'bundle',
        action: 'manage',
        description: 'Manage all bundles',
      },

      // User permissions
      { name: 'user:read', resource: 'user', action: 'read', description: 'View users' },
      { name: 'user:write', resource: 'user', action: 'write', description: 'Create/modify users' },
      { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete users' },
      { name: 'user:manage', resource: 'user', action: 'manage', description: 'Manage all users' },

      // Asset permissions
      { name: 'asset:read', resource: 'asset', action: 'read', description: 'View assets' },
      {
        name: 'asset:write',
        resource: 'asset',
        action: 'write',
        description: 'Upload/modify assets',
      },
      { name: 'asset:delete', resource: 'asset', action: 'delete', description: 'Delete assets' },
      {
        name: 'asset:manage',
        resource: 'asset',
        action: 'manage',
        description: 'Manage all assets',
      },
    ];

    // Create permissions if they don't exist
    const createdPermissions = new Map<string, string>();
    for (const perm of defaultPermissions) {
      const existing = await this.permissionRepository.findByName(perm.name);
      if (!existing) {
        const created = await this.permissionRepository.create(perm);
        createdPermissions.set(perm.name, created.id);
        this.log.info(`Created permission: ${perm.name}`);
      } else {
        createdPermissions.set(perm.name, existing.id);
      }
    }

    // Define default roles with their permissions
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: ['replicant:manage', 'bundle:manage', 'user:manage', 'asset:manage'],
      },
      {
        name: 'operator',
        displayName: 'Operator',
        description: 'Can manage content but not users',
        permissions: [
          'replicant:read',
          'replicant:write',
          'bundle:read',
          'asset:read',
          'asset:write',
        ],
      },
      {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        permissions: ['replicant:read', 'bundle:read', 'asset:read'],
      },
    ];

    // Create roles if they don't exist
    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findByName(roleData.name);
      if (!existing) {
        const role = await this.roleRepository.create({
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
        });

        // Assign permissions to role
        for (const permName of roleData.permissions) {
          const permId = createdPermissions.get(permName);
          if (permId) {
            await this.roleRepository.addPermission(role.id, permId);
          }
        }

        this.log.info(
          `Created role: ${roleData.name} with ${roleData.permissions.length} permissions`
        );
      } else {
        this.log.debug(`Role already exists: ${roleData.name}`);
      }
    }
  }

  /**
   * Clear permission cache for a user
   */
  private clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.permissionCache.delete(key));
  }

  /**
   * Clear all permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}
