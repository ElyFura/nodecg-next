/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

import { EventEmitter } from 'events';
import type { Logger } from '@nodecg/types';
import { createLogger } from '../../utils/logger.js';
import type {
  UserRepository,
  RoleRepository,
  SessionRepository,
} from '../../database/repositories/index.js';
import { hashPassword, verifyPassword } from './utils/password.js';
import { generateTokenPair, verifyToken } from './utils/jwt.js';

const logger = createLogger({ level: 'info' });

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  roleId?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    username: string;
    email: string | null;
    roleId: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionInfo {
  userId: string;
  username: string;
  roleId?: string;
  sessionId: string;
}

/**
 * Authentication Service
 * Manages user authentication and session lifecycle
 */
export class AuthService extends EventEmitter {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;
  private sessionRepository: SessionRepository;
  private log: Logger;

  constructor(
    userRepository: UserRepository,
    roleRepository: RoleRepository,
    sessionRepository: SessionRepository,
    customLogger?: Logger
  ) {
    super();
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.sessionRepository = sessionRepository;
    this.log = customLogger || logger;
  }

  /**
   * Register a new user
   */
  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    // Check if username already exists
    const existingUser = await this.userRepository.findByUsername(input.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email already exists (if provided)
    if (input.email) {
      const existingEmail = await this.userRepository.findByEmail(input.email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Get default role if not provided
    let roleId = input.roleId;
    if (!roleId) {
      const viewerRole = await this.roleRepository.findByName('viewer');
      roleId = viewerRole?.id;
    }

    // Create user
    const user = await this.userRepository.create({
      username: input.username,
      email: input.email,
      password: hashedPassword,
      roleId,
    });

    this.log.info(`User registered: ${user.username} (${user.id})`);
    this.emit('user:registered', { userId: user.id, username: user.username });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      roleId: user.roleId || undefined,
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.sessionRepository.create({
      userId: user.id,
      token: tokens.accessToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Login with username and password
   */
  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    // Find user by username
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user has a password (OAuth-only users don't)
    if (!user.password) {
      throw new Error('This account uses OAuth. Please login with your OAuth provider.');
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    this.log.info(`User logged in: ${user.username} (${user.id})`);
    this.emit('user:login', { userId: user.id, username: user.username });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      roleId: user.roleId || undefined,
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.sessionRepository.create({
      userId: user.id,
      token: tokens.accessToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout (invalidate session)
   */
  async logout(token: string): Promise<void> {
    await this.sessionRepository.deleteByToken(token);
    this.log.info('User logged out');
    this.emit('user:logout', { token });
  }

  /**
   * Validate token and get session info
   */
  async validateToken(token: string): Promise<SessionInfo | null> {
    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    // Check if session exists and is active
    const session = await this.sessionRepository.findActiveSessionByToken(token);
    if (!session) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      roleId: payload.roleId,
      sessionId: session.id,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const tokens = generateTokenPair({
      userId: payload.userId,
      username: payload.username,
      roleId: payload.roleId,
    });

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const count = await this.sessionRepository.deleteExpired();
    this.log.info(`Cleaned up ${count} expired sessions`);
    return count;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('This account uses OAuth and does not have a password');
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    this.log.info(`Password changed for user: ${user.username} (${userId})`);
    this.emit('user:password-changed', { userId, username: user.username });
  }
}
