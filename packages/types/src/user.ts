/**
 * User and authentication type definitions for NodeCG Next
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export interface User {
  /** User ID */
  id: string;
  /** Username (unique) */
  username: string;
  /** Email address */
  email?: string;
  /** User role */
  role: UserRole;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** OAuth providers */
  providers?: OAuthProvider[];
}

export interface OAuthProvider {
  /** Provider name (e.g., 'twitch', 'discord', 'google') */
  provider: string;
  /** Provider user ID */
  providerId: string;
  /** Access token */
  accessToken?: string;
  /** Refresh token */
  refreshToken?: string;
  /** Token expiry */
  expiresAt?: Date;
}

export interface Session {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session token (JWT) */
  token: string;
  /** Session expiry */
  expiresAt: Date;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Created timestamp */
  createdAt: Date;
}

export interface JWTPayload {
  /** Subject (user ID) */
  sub: string;
  /** Username */
  username: string;
  /** User role */
  role: UserRole;
  /** Issued at */
  iat: number;
  /** Expires at */
  exp: number;
}

export interface AuthService {
  /** Authenticate with username/password */
  login(username: string, password: string): Promise<{ user: User; token: string }>;
  /** Logout (invalidate session) */
  logout(token: string): Promise<void>;
  /** Verify JWT token */
  verify(token: string): Promise<JWTPayload>;
  /** Refresh token */
  refresh(token: string): Promise<{ user: User; token: string }>;
  /** Register new user */
  register(username: string, password: string, email?: string): Promise<User>;
}

export interface Permission {
  /** Resource type */
  resource: string;
  /** Action */
  action: 'create' | 'read' | 'update' | 'delete';
  /** Whether permission is granted */
  granted: boolean;
}

export interface RBACService {
  /** Check if user has permission */
  can(userId: string, resource: string, action: string): Promise<boolean>;
  /** Get all permissions for a role */
  getPermissions(role: UserRole): Permission[];
  /** Grant permission to role */
  grantPermission(role: UserRole, resource: string, action: string): Promise<void>;
  /** Revoke permission from role */
  revokePermission(role: UserRole, resource: string, action: string): Promise<void>;
}
