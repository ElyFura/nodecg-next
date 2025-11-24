/**
 * OAuth Service
 * Handles OAuth2 authentication with multiple providers
 */

import type { Logger } from '@nodecg/types';
import { createLogger } from '../../utils/logger.js';
import type {
  UserRepository,
  OAuthProviderRepository,
  SessionRepository,
} from '../../database/repositories/index.js';
import { generateTokenPair } from './utils/jwt.js';

const logger = createLogger({ level: 'info' });

export interface OAuthUserInfo {
  providerId: string;
  username: string;
  email?: string;
  avatar?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * OAuth Service
 * Manages OAuth2 authentication flow
 */
export class OAuthService {
  private userRepository: UserRepository;
  private oauthProviderRepository: OAuthProviderRepository;
  private sessionRepository: SessionRepository;
  private log: Logger;

  constructor(
    userRepository: UserRepository,
    oauthProviderRepository: OAuthProviderRepository,
    sessionRepository: SessionRepository,
    customLogger?: Logger
  ) {
    this.userRepository = userRepository;
    this.oauthProviderRepository = oauthProviderRepository;
    this.sessionRepository = sessionRepository;
    this.log = customLogger || logger;
  }

  /**
   * Handle OAuth callback and create/login user
   */
  async handleOAuthCallback(
    provider: string,
    userInfo: OAuthUserInfo,
    tokens: OAuthTokens,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Check if OAuth provider entry exists
    let oauthProvider = await this.oauthProviderRepository.findByProviderAndId(
      provider,
      userInfo.providerId
    );

    let user;

    if (oauthProvider) {
      // Existing OAuth connection - update tokens
      await this.oauthProviderRepository.updateTokens(oauthProvider.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
      });

      user = oauthProvider.user;
      this.log.info(`User logged in via ${provider}: ${user.username} (${user.id})`);
    } else {
      // New OAuth connection - check if user exists by email or create new
      if (userInfo.email) {
        user = await this.userRepository.findByEmail(userInfo.email);
      }

      if (!user) {
        // Create new user
        user = await this.userRepository.create({
          username: userInfo.username,
          email: userInfo.email,
          password: undefined, // OAuth users don't have password
        });

        this.log.info(`New user created via ${provider}: ${user.username} (${user.id})`);
      }

      // Create OAuth provider entry
      await this.oauthProviderRepository.create({
        userId: user.id,
        provider,
        providerId: userInfo.providerId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
      });

      this.log.info(`OAuth provider ${provider} linked to user ${user.username}`);
    }

    // Generate JWT tokens
    const jwtTokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      roleId: user.roleId || undefined,
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.sessionRepository.create({
      userId: user.id,
      token: jwtTokens.accessToken,
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
      accessToken: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken,
      expiresIn: jwtTokens.expiresIn,
    };
  }

  /**
   * Link OAuth provider to existing authenticated user
   */
  async linkProvider(
    userId: string,
    provider: string,
    userInfo: OAuthUserInfo,
    tokens: OAuthTokens
  ) {
    // Check if provider is already linked to another user
    const existing = await this.oauthProviderRepository.findByProviderAndId(
      provider,
      userInfo.providerId
    );

    if (existing) {
      if (existing.userId !== userId) {
        throw new Error(`This ${provider} account is already linked to another user`);
      }
      // Already linked to this user, update tokens
      await this.oauthProviderRepository.updateTokens(existing.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
      });
      return;
    }

    // Link new provider
    await this.oauthProviderRepository.create({
      userId,
      provider,
      providerId: userInfo.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
    });

    this.log.info(`OAuth provider ${provider} linked to user ${userId}`);
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkProvider(userId: string, provider: string) {
    const user = (await this.userRepository.findById(userId)) as any;
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure user has password or another OAuth provider
    if (!user.password && user.providers.length <= 1) {
      throw new Error(
        'Cannot unlink the only authentication method. Set a password first or link another provider.'
      );
    }

    // Find and delete the provider
    const providers = user.providers.filter((p: any) => p.provider === provider);
    for (const p of providers) {
      await this.oauthProviderRepository.delete(p.id);
    }

    this.log.info(`OAuth provider ${provider} unlinked from user ${userId}`);
  }
}
