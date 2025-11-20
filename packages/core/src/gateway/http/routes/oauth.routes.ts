/**
 * OAuth Routes
 * Handles OAuth2 authentication with Twitch, Discord, and GitHub
 */

/* global fetch */
import type { FastifyInstance } from 'fastify';
import fastifyOAuth2 from '@fastify/oauth2';
import type { OAuthService, AuditService } from '../../../services/auth/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger({ level: 'info' });

export interface OAuthRoutesOptions {
  oauthService: OAuthService;
  auditService: AuditService;
  baseUrl: string; // e.g., "http://localhost:3000"
}

/**
 * Register OAuth routes for multiple providers
 */
export async function registerOAuthRoutes(
  fastify: FastifyInstance,
  { oauthService, auditService, baseUrl }: OAuthRoutesOptions
) {
  // Twitch OAuth
  if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
    await fastify.register(fastifyOAuth2, {
      name: 'twitchOAuth2',
      scope: ['user:read:email'],
      credentials: {
        client: {
          id: process.env.TWITCH_CLIENT_ID,
          secret: process.env.TWITCH_CLIENT_SECRET,
        },
        auth: fastifyOAuth2.TWITCH_CONFIGURATION,
      },
      startRedirectPath: '/auth/twitch',
      callbackUri: `${baseUrl}/auth/twitch/callback`,
    });

    fastify.get('/auth/twitch/callback', async (request, reply) => {
      try {
        const { token } = await (
          fastify as any
        ).twitchOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Fetch user info from Twitch API
        const userResponse = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID!,
          },
        });

        const userData = (await userResponse.json()) as any;
        const twitchUser = userData.data[0];

        const result = await oauthService.handleOAuthCallback(
          'twitch',
          {
            providerId: twitchUser.id,
            username: twitchUser.login,
            email: twitchUser.email,
            avatar: twitchUser.profile_image_url,
          },
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in,
          },
          request.ip,
          request.headers['user-agent']
        );

        await auditService.logAuth(
          'login',
          result.user.id,
          request.ip,
          request.headers['user-agent']
        );

        // Redirect to frontend with tokens
        return reply.redirect(
          `${baseUrl}/auth/success?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
        );
      } catch (error) {
        logger.error('Twitch OAuth error:', error);
        return reply.redirect(`${baseUrl}/auth/error?provider=twitch`);
      }
    });

    logger.info('Twitch OAuth routes registered');
  }

  // Discord OAuth
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    await fastify.register(fastifyOAuth2, {
      name: 'discordOAuth2',
      scope: ['identify', 'email'],
      credentials: {
        client: {
          id: process.env.DISCORD_CLIENT_ID,
          secret: process.env.DISCORD_CLIENT_SECRET,
        },
        auth: fastifyOAuth2.DISCORD_CONFIGURATION,
      },
      startRedirectPath: '/auth/discord',
      callbackUri: `${baseUrl}/auth/discord/callback`,
    });

    fastify.get('/auth/discord/callback', async (request, reply) => {
      try {
        const { token } = await (
          fastify as any
        ).discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Fetch user info from Discord API
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        });

        const discordUser = (await userResponse.json()) as any;

        const result = await oauthService.handleOAuthCallback(
          'discord',
          {
            providerId: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            avatar: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : undefined,
          },
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in,
          },
          request.ip,
          request.headers['user-agent']
        );

        await auditService.logAuth(
          'login',
          result.user.id,
          request.ip,
          request.headers['user-agent']
        );

        // Redirect to frontend with tokens
        return reply.redirect(
          `${baseUrl}/auth/success?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
        );
      } catch (error) {
        logger.error('Discord OAuth error:', error);
        return reply.redirect(`${baseUrl}/auth/error?provider=discord`);
      }
    });

    logger.info('Discord OAuth routes registered');
  }

  // GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    await fastify.register(fastifyOAuth2, {
      name: 'githubOAuth2',
      scope: ['user:email'],
      credentials: {
        client: {
          id: process.env.GITHUB_CLIENT_ID,
          secret: process.env.GITHUB_CLIENT_SECRET,
        },
        auth: fastifyOAuth2.GITHUB_CONFIGURATION,
      },
      startRedirectPath: '/auth/github',
      callbackUri: `${baseUrl}/auth/github/callback`,
    });

    fastify.get('/auth/github/callback', async (request, reply) => {
      try {
        const { token } = await (
          fastify as any
        ).githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Fetch user info from GitHub API
        const [userResponse, emailsResponse] = await Promise.all([
          fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }),
          fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }),
        ]);

        const githubUser = (await userResponse.json()) as any;
        const emails = (await emailsResponse.json()) as any;
        const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email;

        const result = await oauthService.handleOAuthCallback(
          'github',
          {
            providerId: String(githubUser.id),
            username: githubUser.login,
            email: primaryEmail,
            avatar: githubUser.avatar_url,
          },
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in,
          },
          request.ip,
          request.headers['user-agent']
        );

        await auditService.logAuth(
          'login',
          result.user.id,
          request.ip,
          request.headers['user-agent']
        );

        // Redirect to frontend with tokens
        return reply.redirect(
          `${baseUrl}/auth/success?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
        );
      } catch (error) {
        logger.error('GitHub OAuth error:', error);
        return reply.redirect(`${baseUrl}/auth/error?provider=github`);
      }
    });

    logger.info('GitHub OAuth routes registered');
  }

  logger.info('OAuth routes initialization complete');
}
