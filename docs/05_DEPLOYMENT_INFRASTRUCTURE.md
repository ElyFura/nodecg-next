# NodeCG Next - Deployment & Infrastructure

## DevOps, Docker, Kubernetes & Cloud Setup

**Version:** 1.0  
**Status:** Production-Ready

---

## 🐳 Docker Setup

### Dockerfile (Multi-Stage Build)

```dockerfile
# Datei: Dockerfile

# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build all packages
RUN pnpm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose ports
EXPOSE 3000 3001 4000

# Start server
CMD ["node", "dist/index.js"]
```

### docker-compose.yml (Development)

Siehe `nodecg_ground_up_rebuild.md` für vollständiges docker-compose.yml

---

## ☸️ Kubernetes Deployment

### Deployment Manifest

Siehe `01_ARCHITECTURE_DESIGN.md` Abschnitt "Deployment-Architektur"

---

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run test
      - run: pnpm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: nodecg/nodecg-next:${{ github.sha }}
```

---

**Vollständige Infrastructure-Details in:**

- `nodecg_ground_up_rebuild.md` - Docker & K8s Setup
- `01_ARCHITECTURE_DESIGN.md` - Deployment-Architektur

---

**Dokument-Version:** 1.0
