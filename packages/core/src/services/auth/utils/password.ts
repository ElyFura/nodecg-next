/**
 * Password hashing utilities using bcrypt
 */

import bcrypt from 'bcrypt';

// Salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a hash needs to be rehashed (salt rounds changed)
 * @param hash - Hashed password
 * @returns True if rehash is needed
 */
export function needsRehash(hash: string): boolean {
  const rounds = bcrypt.getRounds(hash);
  return rounds < SALT_ROUNDS;
}
