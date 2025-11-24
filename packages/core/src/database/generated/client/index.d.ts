/**
 * Prisma Client Stub Types
 * This is a minimal type stub for offline environments
 * Run `pnpm prisma generate` in online environment to generate full types
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Forward declare the class
declare class PrismaClientClass {
  replicant: any;
  replicantHistory: any;
  user: any;
  session: any;
  oAuthProvider: any;
  asset: any;
  bundle: any;
  auditLog: any;

  constructor(options?: any);

  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(fn: (prisma: PrismaClientClass) => Promise<T>): Promise<T>;
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T>;
  $on(event: string, callback: (e: any) => void): void;
}

export { PrismaClientClass as PrismaClient };
export { PrismaClientClass as Prisma };

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// Model types
export interface Replicant {
  id: string;
  namespace: string;
  name: string;
  value: string;
  schema: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  history?: ReplicantHistory[];
}

export interface ReplicantHistory {
  id: string;
  replicantId: string;
  replicant?: Replicant;
  value: string;
  changedBy: string | null;
  changedAt: Date;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  password: string | null;
  role: UserRole;
  providers?: OAuthProvider[];
  sessions?: Session[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  user?: User;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface OAuthProvider {
  id: string;
  userId: string;
  user?: User;
  provider: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  namespace: string;
  category: string;
  name: string;
  sum: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bundle {
  id: string;
  name: string;
  version: string;
  config: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  resourceType: string;
  resourceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date;
}
