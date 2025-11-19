# NodeCG Next - Dockerfile
# Multi-stage build for production

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/

# Install dependencies
FROM base AS dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS build
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from build stage
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/src/database/generated ./packages/core/src/database/generated

# Copy necessary source files (for Prisma)
COPY packages/core/prisma ./packages/core/prisma

# Expose ports
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "packages/core/dist/index.js"]
