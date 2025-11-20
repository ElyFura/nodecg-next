/**
 * Authentication and Authorization Services
 * Export all auth-related services
 */

export { AuthService } from './auth.service.js';
export type { RegisterInput, LoginInput, AuthResult, SessionInfo } from './auth.service.js';

export { RBACService } from './rbac.service.js';
export type { PermissionCheck } from './rbac.service.js';

export { AuditService } from './audit.service.js';
export type { AuditLogEntry, AuditLogQuery } from './audit.service.js';

export { hashPassword, verifyPassword, needsRehash } from './utils/password.js';
export {
  generateToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  isTokenExpired,
} from './utils/jwt.js';
export type { JWTPayload, TokenPair } from './utils/jwt.js';
