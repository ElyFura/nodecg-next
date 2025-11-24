/**
 * Database Initialization
 * Creates database directory and initializes schema
 */

import { mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { Logger } from '@nodecg/types';
import { getPrismaClient } from './client.js';

/**
 * Initialize database
 * - Creates /db directory if it doesn't exist
 * - Pushes Prisma schema to database
 * - Returns Prisma client ready to use
 */
export async function initializeDatabase(logger?: Logger): Promise<void> {
  try {
    // Get database path from schema.prisma
    // Default: file:../../../db/node.db (relative to prisma directory)
    const projectRoot = process.cwd();
    const dbDir = `${projectRoot}/db`;
    const dbPath = `${dbDir}/node.db`;

    logger?.info(`Initializing database at ${dbPath}...`);

    // Create /db directory if it doesn't exist
    if (!existsSync(dbDir)) {
      logger?.info(`Creating database directory: ${dbDir}`);
      mkdirSync(dbDir, { recursive: true });
    }

    // Check if database file exists
    const dbExists = existsSync(dbPath);

    if (!dbExists) {
      logger?.info('Database file does not exist, creating schema...');

      // Run prisma db push to create database with schema
      try {
        execSync('pnpm prisma db push --skip-generate', {
          cwd: projectRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            DATABASE_URL: `file:${dbPath}`,
          },
        });
        logger?.info('Database schema created successfully');
      } catch (error) {
        logger?.error('Failed to create database schema:', error);
        throw new Error('Database initialization failed');
      }
    } else {
      logger?.info('Database file exists, connecting...');
    }

    // Test connection
    const prisma = getPrismaClient(logger);
    await prisma.$connect();
    logger?.info('Database connection established');
  } catch (error) {
    logger?.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Initialize default roles and permissions
 * Should be called after database is initialized
 */
export async function seedDefaultRoles(logger?: Logger): Promise<void> {
  try {
    const prisma = getPrismaClient(logger);

    // Check if roles already exist
    const existingRoles = await prisma.role.count();
    if (existingRoles > 0) {
      logger?.info(`Roles already initialized (${existingRoles} roles exist)`);
      return;
    }

    logger?.info('Seeding default roles and permissions...');

    // Define default permissions
    const permissions = [
      { name: 'replicant:read', resource: 'replicant', action: 'read' },
      { name: 'replicant:write', resource: 'replicant', action: 'write' },
      { name: 'replicant:manage', resource: 'replicant', action: 'manage' },
      { name: 'bundle:read', resource: 'bundle', action: 'read' },
      { name: 'bundle:write', resource: 'bundle', action: 'write' },
      { name: 'bundle:manage', resource: 'bundle', action: 'manage' },
      { name: 'asset:read', resource: 'asset', action: 'read' },
      { name: 'asset:write', resource: 'asset', action: 'write' },
      { name: 'asset:manage', resource: 'asset', action: 'manage' },
      { name: 'user:read', resource: 'user', action: 'read' },
      { name: 'user:write', resource: 'user', action: 'write' },
      { name: 'user:manage', resource: 'user', action: 'manage' },
    ];

    // Create permissions
    const createdPermissions = await Promise.all(
      permissions.map((perm) =>
        prisma.permission.create({
          data: perm,
        })
      )
    );

    logger?.info(`Created ${createdPermissions.length} permissions`);

    // Define default roles with their permissions
    const roles = [
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: ['replicant:manage', 'bundle:manage', 'asset:manage', 'user:manage'],
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

    // Create roles and assign permissions
    for (const roleData of roles) {
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
        },
      });

      // Find permission IDs and create RolePermission entries
      const permissionIds = await Promise.all(
        roleData.permissions.map(async (permName) => {
          const perm = createdPermissions.find((p) => p.name === permName);
          return perm!.id;
        })
      );

      await Promise.all(
        permissionIds.map((permId) =>
          prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permId,
            },
          })
        )
      );

      logger?.info(`Created role: ${role.displayName} with ${permissionIds.length} permissions`);
    }

    logger?.info('Default roles and permissions seeded successfully');
  } catch (error) {
    logger?.error('Failed to seed default roles:', error);
    throw error;
  }
}
