/**
 * JWT token generation and validation utilities
 */

import jwt from 'jsonwebtoken';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger({ level: 'info' });

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // 7 days default
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d'; // 30 days

export interface JWTPayload {
  userId: string;
  username: string;
  roleId?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate a JWT token
 * @param payload - Token payload
 * @param expiresIn - Token expiry (default: JWT_EXPIRY)
 * @returns Signed JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'type'>, expiresIn?: string): string {
  const tokenPayload: JWTPayload = {
    ...payload,
    type: 'access',
  };

  const options: jwt.SignOptions = {
    expiresIn: (expiresIn || JWT_EXPIRY) as any,
    issuer: 'nodecg-next',
    audience: 'nodecg-next',
  };

  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * Generate a refresh token
 * @param payload - Token payload
 * @returns Signed refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
  const tokenPayload: JWTPayload = {
    ...payload,
    type: 'refresh',
  };

  const options: jwt.SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRY as any,
    issuer: 'nodecg-next',
    audience: 'nodecg-next',
  };

  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * Generate both access and refresh tokens
 * @param payload - Token payload
 * @returns Token pair
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'type'>): TokenPair {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiry in seconds
  const decoded = jwt.decode(accessToken) as { exp: number };
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'nodecg-next',
      audience: 'nodecg-next',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('Invalid token');
    } else {
      logger.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * Decode a JWT token without verification (use with caution)
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('Token decode error:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const exp = (decoded as jwt.JwtPayload).exp;
  if (!exp) return true;

  return Date.now() >= exp * 1000;
}
