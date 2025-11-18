# NodeCG Next - Multi-stage Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/core ./packages/core
COPY tsconfig.base.json tsconfig.json ./

# Build packages
RUN pnpm build

# Generate Prisma client
WORKDIR /app/packages/core
RUN pnpm prisma:generate

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 nodecg && \
    adduser -D -u 1001 -G nodecg nodecg

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=nodecg:nodecg /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nodecg:nodecg /app/packages/types/package.json ./packages/types/
COPY --from=builder --chown=nodecg:nodecg /app/packages/core/package.json ./packages/core/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder --chown=nodecg:nodecg /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nodecg:nodecg /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=nodecg:nodecg /app/packages/core/prisma ./packages/core/prisma
COPY --from=builder --chown=nodecg:nodecg /app/packages/core/src/database/generated ./packages/core/src/database/generated

# Create bundles directory
RUN mkdir -p /app/bundles && chown nodecg:nodecg /app/bundles

# Switch to non-root user
USER nodecg

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "packages/core/dist/index.js"]
