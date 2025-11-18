# NodeCG - Komplette Neuimplementierung von Grund auf

**Projekt:** NodeCG Next Generation - Ground-Up Rebuild  
**Ansatz:** Greenfield statt Migration  
**Ziel:** Modernes Broadcast-Graphics-Framework mit allen V3-Features  
**Datum:** November 2025  

---

## Executive Summary

Anstatt NodeCG V2 zu migrieren, bauen wir das Framework **von Grund auf neu** mit modernen Technologien und Best Practices. Dies ermöglicht:

- ✅ **Keine Legacy-Altlasten** - Saubere Architektur von Anfang an
- ✅ **Moderne Standards** - TypeScript First, ESM, moderne APIs
- ✅ **Bessere Performance** - Optimiert für heutige Anforderungen
- ✅ **Einfachere Wartung** - Klare Strukturen, weniger technische Schulden
- ✅ **Schnellere Entwicklung** - Keine Rücksicht auf Backward Compatibility

### Zeitrahmen & Budget (Neuimplementierung)

| Metrik | Wert | Vergleich zu Migration |
|--------|------|------------------------|
| **Dauer** | 8-14 Monate | +2 Monate |
| **Entwicklungsaufwand** | 1.600-2.400 Stunden | +40% |
| **Team-Größe** | 3-4 Full-Time Entwickler | +1 Person |
| **Budget** | 180.000€ - 250.000€ | +50% |
| **Risiko** | Mittel-Hoch | Höher als Migration |
| **Langfristige Vorteile** | Sehr Hoch | Deutlich besser |

**Empfehlung:** Neuimplementierung lohnt sich, wenn:
- Budget und Zeit verfügbar sind
- Langfristige Vision wichtiger als schnelle Migration
- Team hat Kapazität für größeres Projekt
- Breaking Changes akzeptabel sind

---

## 1. Vision & Kernkonzept

### 1.1 Was ist NodeCG Next?

**NodeCG Next** ist ein modernes, TypeScript-first Framework für professionelle Broadcast-Graphics, das von Grund auf für die Anforderungen moderner Streaming-Produktionen entwickelt wurde.

### 1.2 Kernprinzipien

1. **TypeScript First** - 100% TypeScript, keine JavaScript-Altlasten
2. **Developer Experience** - Setup in <2 Minuten, Hot Reload <100ms
3. **Modern Web** - ESM, Web Standards, Progressive Web App
4. **Plugin Architecture** - Alles ist ein Plugin
5. **Cloud Native** - Docker, Kubernetes, Horizontal Scaling
6. **API First** - GraphQL + REST APIs für maximale Flexibilität
7. **Real-time** - WebSocket + WebRTC für minimale Latenz
8. **Security First** - OAuth2, RBAC, Audit Logs aus der Box

### 1.3 Differenzierung zu NodeCG V2

| Feature | NodeCG V2 | NodeCG Next |
|---------|-----------|-------------|
| Sprache | JavaScript + teilweise TS | 100% TypeScript |
| Module System | CommonJS | Native ESM |
| UI Framework | Polymer 3 | React 18+ / Vue 3 |
| Build System | Custom | Vite 6+ |
| WebSocket | Socket.IO V2 | Socket.IO V4 + WebRTC |
| Database | NeDB | Prisma + Multi-DB |
| API | Custom | GraphQL + REST |
| Auth | Basic | OAuth2 + RBAC + SSO |
| Deployment | Manual | Docker + K8s |
| Testing | Puppeteer | Vitest + Playwright |
| Monitoring | Minimal | OpenTelemetry |
| Scaling | Single Instance | Horizontal Scaling |

---

## 2. Architektur von Grund auf

### 2.1 High-Level Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
├─────────────────────────────────────────────────────────────┤
│  Dashboard        Graphics        Extension Client           │
│  (React/Vue)      (Framework-     (Node.js)                 │
│                   agnostic)                                  │
└────────────┬──────────────┬────────────────┬────────────────┘
             │              │                │
             │ WebSocket    │ WebSocket      │ HTTP/GraphQL
             │              │                │
┌────────────▼──────────────▼────────────────▼────────────────┐
│                     API Gateway Layer                        │
├─────────────────────────────────────────────────────────────┤
│  GraphQL Server    REST API       WebSocket Gateway         │
│  Rate Limiting     Auth Middleware   Connection Manager     │
└────────────┬──────────────┬────────────────┬────────────────┘
             │              │                │
┌────────────▼──────────────▼────────────────▼────────────────┐
│                     Core Service Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Replicant Service   Bundle Manager   Plugin System         │
│  Asset Manager       User Service     Event Bus             │
│  Message Router      Config Service   Analytics             │
└────────────┬──────────────┬────────────────┬────────────────┘
             │              │                │
┌────────────▼──────────────▼────────────────▼────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL    Redis Cache    S3/MinIO    Message Queue     │
│  (Primary DB)  (Sessions)     (Assets)    (RabbitMQ)        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo-Struktur (Neuimplementierung)

```
nodecg-next/
├── packages/
│   ├── core/                          # @nodecg/core
│   │   ├── src/
│   │   │   ├── server/               # Express/Fastify Server
│   │   │   │   ├── index.ts
│   │   │   │   ├── middleware/
│   │   │   │   ├── routes/
│   │   │   │   └── websocket/
│   │   │   ├── services/             # Business Logic
│   │   │   │   ├── replicant/
│   │   │   │   ├── bundle/
│   │   │   │   ├── asset/
│   │   │   │   ├── auth/
│   │   │   │   └── plugin/
│   │   │   ├── database/             # Prisma + Adapters
│   │   │   │   ├── prisma/
│   │   │   │   ├── repositories/
│   │   │   │   └── migrations/
│   │   │   ├── graphql/              # GraphQL Schema & Resolvers
│   │   │   │   ├── schema/
│   │   │   │   └── resolvers/
│   │   │   └── utils/
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── cli/                           # @nodecg/cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── create.ts         # create bundle
│   │   │   │   ├── dev.ts            # dev server
│   │   │   │   ├── build.ts          # production build
│   │   │   │   ├── deploy.ts         # deployment
│   │   │   │   └── migrate.ts        # migration from V2
│   │   │   ├── templates/            # Bundle Templates
│   │   │   │   ├── react/
│   │   │   │   ├── vue/
│   │   │   │   └── svelte/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── client/                        # @nodecg/client
│   │   ├── src/
│   │   │   ├── replicant/            # Client Replicant API
│   │   │   ├── graphql/              # GraphQL Client
│   │   │   ├── websocket/            # WebSocket Client
│   │   │   └── hooks/                # Framework Hooks
│   │   │       ├── react/            # React Hooks
│   │   │       ├── vue/              # Vue Composables
│   │   │       └── svelte/           # Svelte Stores
│   │   └── package.json
│   │
│   ├── dashboard/                     # @nodecg/dashboard
│   │   ├── src/
│   │   │   ├── components/           # UI Components
│   │   │   │   ├── layout/
│   │   │   │   ├── panels/
│   │   │   │   ├── assets/
│   │   │   │   └── settings/
│   │   │   ├── pages/                # Dashboard Pages
│   │   │   │   ├── home.tsx
│   │   │   │   ├── bundles.tsx
│   │   │   │   ├── assets.tsx
│   │   │   │   └── settings.tsx
│   │   │   ├── stores/               # State Management
│   │   │   ├── api/                  # API Clients
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   ├── types/                         # @nodecg/types
│   │   ├── src/
│   │   │   ├── core.ts
│   │   │   ├── bundle.ts
│   │   │   ├── replicant.ts
│   │   │   ├── plugin.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── plugins/                       # Official Plugins
│   │   ├── auth-oauth2/              # @nodecg/plugin-auth-oauth2
│   │   ├── auth-ldap/                # @nodecg/plugin-auth-ldap
│   │   ├── analytics/                # @nodecg/plugin-analytics
│   │   ├── audit-log/                # @nodecg/plugin-audit-log
│   │   ├── webhooks/                 # @nodecg/plugin-webhooks
│   │   └── obs-websocket/            # @nodecg/plugin-obs-websocket
│   │
│   ├── database-adapters/             # Database Adapters
│   │   ├── postgresql/               # @nodecg/db-postgresql
│   │   ├── mysql/                    # @nodecg/db-mysql
│   │   ├── mongodb/                  # @nodecg/db-mongodb
│   │   └── sqlite/                   # @nodecg/db-sqlite
│   │
│   └── dev-tools/                     # Development Tools
│       ├── vite-plugin/              # @nodecg/vite-plugin
│       ├── eslint-config/            # @nodecg/eslint-config
│       ├── tsconfig/                 # @nodecg/tsconfig
│       └── testing-library/          # @nodecg/testing-library
│
├── apps/                              # Standalone Apps
│   ├── desktop/                      # Electron Desktop App
│   │   ├── src/
│   │   └── package.json
│   ├── mobile/                       # React Native Mobile App
│   │   ├── src/
│   │   └── package.json
│   └── web/                          # Standalone Web App
│       ├── src/
│       └── package.json
│
├── bundles/                           # Example Bundles
│   ├── example-basic/
│   ├── example-react/
│   └── example-advanced/
│
├── infrastructure/                    # Infrastructure as Code
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   └── terraform/
│       └── main.tf
│
├── docs/                              # VitePress Documentation
│   ├── guide/
│   ├── api/
│   ├── plugins/
│   └── deployment/
│
├── scripts/                           # Build & Deployment Scripts
├── .github/workflows/                 # CI/CD
├── turbo.json                        # Turborepo Config
├── pnpm-workspace.yaml               # pnpm Workspaces
└── package.json                      # Root Package
```

---

## 3. Technologie-Stack (Ground-Up)

### 3.1 Backend

```typescript
// package.json - Backend Dependencies

{
  "dependencies": {
    // Core Framework
    "fastify": "^5.0.0",              // Schneller als Express
    "fastify-plugin": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^12.0.0",
    "@fastify/rate-limit": "^10.0.0",
    
    // GraphQL
    "@apollo/server": "^4.11.0",
    "graphql": "^16.9.0",
    "@graphql-tools/schema": "^10.0.0",
    
    // WebSocket
    "socket.io": "^4.8.0",
    "ws": "^8.18.0",
    
    // Database
    "@prisma/client": "^6.0.0",
    "prisma": "^6.0.0",
    
    // Cache & Queue
    "ioredis": "^5.4.0",
    "amqplib": "^0.10.0",
    
    // Authentication
    "jsonwebtoken": "^9.0.0",
    "passport": "^0.7.0",
    "bcrypt": "^5.1.0",
    
    // Utilities
    "zod": "^3.23.0",               // Validation
    "pino": "^9.4.0",               // Logging
    "pino-pretty": "^11.2.0",
    "dotenv": "^16.4.0",
    
    // Observability
    "@opentelemetry/sdk-node": "^0.53.0",
    "@opentelemetry/auto-instrumentations-node": "^0.50.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.8.0"
  }
}
```

### 3.2 Frontend

```typescript
// package.json - Frontend Dependencies

{
  "dependencies": {
    // UI Framework
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    // Routing
    "@tanstack/react-router": "^1.73.0",
    
    // State Management
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.59.0",
    
    // GraphQL Client
    "@apollo/client": "^3.11.0",
    "graphql": "^16.9.0",
    
    // UI Components
    "@radix-ui/react-*": "^1.1.0",  // Primitives
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    
    // Forms & Validation
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    
    // Utilities
    "date-fns": "^4.1.0",
    "lodash-es": "^4.17.21"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 3.3 DevOps & Infrastructure

```yaml
# docker-compose.yml - Development Stack

version: '3.8'

services:
  # NodeCG Next Server
  nodecg:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"    # WebSocket
      - "4000:4000"    # GraphQL
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://nodecg:nodecg@postgres:5432/nodecg
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq:5672
    volumes:
      - ./bundles:/app/bundles
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nodecg
      POSTGRES_PASSWORD: nodecg
      POSTGRES_DB: nodecg
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # RabbitMQ Message Queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: nodecg
      RABBITMQ_DEFAULT_PASS: nodecg

  # MinIO (S3-compatible Object Storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: nodecg
      MINIO_ROOT_PASSWORD: nodecg123
    volumes:
      - minio-data:/data

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

---

## 4. Implementierungs-Phasen (Ground-Up)

### Phase 1: Core Foundation (Monate 1-3)
**Aufwand:** 480-720 Stunden

#### 1.1 Project Setup
- Monorepo mit pnpm + Turborepo
- TypeScript Konfiguration
- ESLint + Prettier
- Vitest Testing Setup
- CI/CD Pipeline (GitHub Actions)

#### 1.2 Core Server
- Fastify Server Setup
- Middleware Pipeline
- Error Handling
- Logging (Pino)
- Configuration (Zod)

#### 1.3 Database Layer
- Prisma Schema Design
- Repository Pattern
- Migrations System
- Connection Pooling
- Multi-Tenant Support (optional)

#### 1.4 WebSocket Layer
- Socket.IO V4 Integration
- Connection Management
- Room/Namespace System
- Heartbeat/Reconnection
- Message Routing

**Deliverables Phase 1:**
- ✅ Lauffähiger Server mit DB-Anbindung
- ✅ WebSocket funktionsfähig
- ✅ Basis-Tests (>80% Coverage)
- ✅ Docker-Setup

### Phase 2: Replicant System V2 (Monate 2-4)
**Aufwand:** 400-600 Stunden

#### 2.1 Replicant Core
- Type-Safe Replicant API
- Schema Validation (Zod)
- Change Detection
- Persistence Layer
- History/Versioning

#### 2.2 Replicant Synchronization
- Client-Server Sync
- Conflict Resolution
- Optimistic Updates
- Delta Updates (nur Änderungen senden)
- Compression

#### 2.3 Replicant Client API
- React Hooks
- Vue Composables
- Svelte Stores
- Vanilla JS API

**Deliverables Phase 2:**
- ✅ Funktionierendes Replicant-System
- ✅ Client-Libraries für React/Vue/Svelte
- ✅ Benchmark: <10ms Latenz für Updates

### Phase 3: Bundle System (Monate 3-5)
**Aufwand:** 400-600 Stunden

#### 3.1 Bundle Manager
- Bundle Discovery
- Dependency Resolution
- Lifecycle Management
- Hot Reload
- Bundle Registry

#### 3.2 Bundle Development
- CLI Tool (create, dev, build)
- Vite Integration
- Template System
- Bundle Validator
- Bundle Documentation Generator

#### 3.3 Asset Management
- Upload System
- Storage (MinIO/S3)
- CDN Integration
- Image Processing
- Audio Processing

**Deliverables Phase 3:**
- ✅ CLI: `npx create-nodecg-bundle`
- ✅ Hot Reload: <100ms
- ✅ Asset Upload funktioniert
- ✅ 3 Bundle-Templates (React, Vue, Minimal)

### Phase 4: Authentication & Authorization (Monate 4-6)
**Aufwand:** 320-480 Stunden

#### 4.1 Authentication
- JWT Token System
- OAuth2 Provider (Twitch, Discord, Google, GitHub)
- LDAP/AD Integration (optional)
- SSO (SAML) (optional)
- 2FA/MFA

#### 4.2 Authorization
- RBAC System
- Permission System
- API Key Management
- Rate Limiting per User
- Audit Logging

**Deliverables Phase 4:**
- ✅ OAuth2 funktioniert
- ✅ RBAC implementiert
- ✅ Audit Log vorhanden

### Phase 5: Dashboard & UI (Monate 5-8)
**Aufwand:** 640-960 Stunden

#### 5.1 Dashboard Core
- React App Setup
- Routing (TanStack Router)
- Layout System
- Theme Support (Light/Dark)
- Responsive Design

#### 5.2 Dashboard Features
- Bundle Management UI
- Asset Manager
- Replicant Inspector
- User Management
- Settings Panel
- Analytics Dashboard

#### 5.3 Component Library
- Button, Input, Select, etc.
- Modal, Drawer, Dropdown
- Table, DataGrid
- Charts (Recharts)
- Forms (React Hook Form)

**Deliverables Phase 5:**
- ✅ Vollständiges Dashboard
- ✅ Mobile-responsive
- ✅ Lighthouse Score >90

### Phase 6: GraphQL API (Monate 6-8)
**Aufwand:** 320-480 Stunden

#### 6.1 GraphQL Server
- Apollo Server Setup
- Schema Definition
- Resolvers
- DataLoader (N+1 Problem)
- Subscriptions

#### 6.2 GraphQL Client
- Apollo Client Integration
- Code Generation (GraphQL Codegen)
- Optimistic Updates
- Cache Management

**Deliverables Phase 6:**
- ✅ GraphQL API funktionsfähig
- ✅ Subscription für Replicants
- ✅ Playground verfügbar

### Phase 7: Plugin System (Monate 7-9)
**Aufwand:** 400-600 Stunden

#### 7.1 Plugin Architecture
- Plugin Loader
- Plugin API
- Plugin Hooks
- Plugin Configuration
- Plugin Registry

#### 7.2 Core Plugins
- OBS WebSocket Plugin
- Analytics Plugin
- Webhook Plugin
- Backup Plugin

**Deliverables Phase 7:**
- ✅ Plugin-System funktioniert
- ✅ 4 Core Plugins verfügbar
- ✅ Plugin Development Guide

### Phase 8: Observability & Production (Monate 8-10)
**Aufwand:** 320-480 Stunden

#### 8.1 Observability
- OpenTelemetry Integration
- Prometheus Metrics
- Structured Logging
- Error Tracking (Sentry)
- Performance Monitoring

#### 8.2 Production Readiness
- Docker Optimization
- Kubernetes Manifests
- Health Checks
- Graceful Shutdown
- Load Testing

**Deliverables Phase 8:**
- ✅ Production-ready Docker Images
- ✅ K8s Deployment funktioniert
- ✅ Monitoring Dashboard

### Phase 9: Documentation & Testing (Monate 9-12)
**Aufwand:** 480-720 Stunden

#### 9.1 Documentation
- VitePress Setup
- User Guide
- Developer Guide
- API Reference
- Video Tutorials

#### 9.2 Testing
- Unit Tests (90%+ Coverage)
- Integration Tests
- E2E Tests (Playwright)
- Performance Tests
- Security Audit

#### 9.3 Migration Tools
- V2 → Next Migration CLI
- Bundle Converter
- Configuration Migrator
- Data Migration

**Deliverables Phase 9:**
- ✅ Vollständige Dokumentation
- ✅ Migration Tools funktionieren
- ✅ Security Audit bestanden

### Phase 10: Beta & Launch (Monate 10-14)
**Aufwand:** 320-480 Stunden

#### 10.1 Beta Release
- Community Testing
- Bug Fixes
- Performance Tuning
- Feature Feedback

#### 10.2 Launch Preparation
- Marketing Material
- Release Notes
- Launch Event
- Community Support

**Deliverables Phase 10:**
- ✅ V1.0.0 Release
- ✅ Launch Event durchgeführt
- ✅ Community Support etabliert

---

## 5. Aufwands- und Kostenschätzung (Neuimplementierung)

### 5.1 Gesamtaufwand nach Phase

| Phase | Dauer | Aufwand (Std.) | FTE |
|-------|-------|----------------|-----|
| Phase 1: Core Foundation | 3 Monate | 480-720 | 2.5 |
| Phase 2: Replicant System | 2 Monate | 400-600 | 3.0 |
| Phase 3: Bundle System | 2 Monate | 400-600 | 2.5 |
| Phase 4: Auth & Authz | 2 Monate | 320-480 | 2.0 |
| Phase 5: Dashboard & UI | 3 Monate | 640-960 | 3.0 |
| Phase 6: GraphQL API | 2 Monate | 320-480 | 2.0 |
| Phase 7: Plugin System | 2 Monate | 400-600 | 2.5 |
| Phase 8: Observability | 2 Monate | 320-480 | 2.0 |
| Phase 9: Docs & Testing | 3 Monate | 480-720 | 2.0 |
| Phase 10: Beta & Launch | 4 Monate | 320-480 | 1.0 |
| **GESAMT** | **25 Monate** | **4.080-6.120** | **~2.3** |

**Aber:** Phasen überlappen sich → **Realistische Dauer: 12-14 Monate**

### 5.2 Team-Struktur

**Empfohlenes Team:**
- 1x Senior Architect/Lead Developer (100%, gesamte Dauer)
- 2x Full-Stack Developer (100%, Monate 1-12)
- 1x Frontend Developer (75%, Monate 5-12)
- 1x DevOps Engineer (50%, Monate 1, 6, 8-10)
- 1x Technical Writer (50%, Monate 9-12)
- 1x QA Engineer (50%, Monate 9-12)

**Minimales Team:**
- 1x Senior Architect (100%)
- 1x Full-Stack Developer (100%)
- 1x Frontend Developer (75%)
- Teil-Zeit: DevOps, Documentation, QA

### 5.3 Kostenabschätzung

**Stundensätze (Annahme):**
- Senior Architect: 100€/Std
- Full-Stack Developer: 80€/Std
- Frontend Developer: 75€/Std
- DevOps Engineer: 85€/Std
- Technical Writer: 60€/Std
- QA Engineer: 70€/Std

**Minimalkalkulation (4.080 Std):**
- 2.040 Std Senior Architect @ 100€: 204.000€
- 1.200 Std Full-Stack Developer @ 80€: 96.000€
- 480 Std Frontend Developer @ 75€: 36.000€
- 200 Std DevOps @ 85€: 17.000€
- 80 Std Technical Writer @ 60€: 4.800€
- 80 Std QA @ 70€: 5.600€
- **Gesamt:** ca. **363.400€**

**Maximalkalkulation (6.120 Std):**
- 3.060 Std Senior Architect @ 100€: 306.000€
- 1.800 Std Full-Stack Developer @ 80€: 144.000€
- 720 Std Frontend Developer @ 75€: 54.000€
- 300 Std DevOps @ 85€: 25.500€
- 120 Std Technical Writer @ 60€: 7.200€
- 120 Std QA @ 70€: 8.400€
- **Gesamt:** ca. **545.100€**

**Realistische Schätzung mit Puffer:**
- **Personalkosten:** 400.000€ - 480.000€
- **Infrastructure:** 24.000€ (2.000€/Monat × 12)
- **Tools & Lizenzen:** 12.000€
- **External Services:** 10.000€
- **Contingency (20%):** 90.000€
- **GESAMT:** **536.000€ - 616.000€**

**Budget-Empfehlung:** **€550.000 - €600.000**

---

## 6. Vergleich: Migration vs. Neuimplementierung

### 6.1 Aufwands-Vergleich

| Metrik | Migration V2→V3 | Neuimplementierung |
|--------|-----------------|-------------------|
| Entwicklungszeit | 1.120-1.840 Std | 4.080-6.120 Std |
| Dauer | 6-12 Monate | 12-14 Monate |
| Budget | 135k-170k€ | 550k-600k€ |
| Team-Größe | 2-3 Personen | 3-4 Personen |
| Risiko | Mittel | Mittel-Hoch |

### 6.2 Vor- und Nachteile

**Migration V2→V3:**

✅ **Vorteile:**
- Geringerer Aufwand
- Schneller fertig
- Bestehende Bundles laufen weiter
- Community-Disruption minimal
- Niedrigeres Risiko

❌ **Nachteile:**
- Legacy-Code bleibt teilweise
- Technische Schulden bleiben
- Kompromisse bei Architektur
- Backward Compatibility limitiert Design
- Nicht alle neuen Features möglich

**Neuimplementierung:**

✅ **Vorteile:**
- Saubere Architektur
- Keine Legacy-Altlasten
- Moderne Best Practices
- Bessere Performance
- Einfachere Wartung langfristig
- Alle gewünschten Features möglich
- Bessere Developer Experience

❌ **Nachteile:**
- Deutlich höherer Aufwand
- Längere Entwicklungszeit
- Höheres Budget erforderlich
- Höheres Risiko
- Breaking Changes für bestehende Bundles
- Community muss migrieren

### 6.3 ROI-Analyse (5 Jahre)

**Migration:**
- Initiale Kosten: 150.000€
- Jährliche Wartung: 20.000€
- Technische Schulden: 30.000€ (über 5 Jahre)
- **Gesamt (5 Jahre):** 280.000€

**Neuimplementierung:**
- Initiale Kosten: 575.000€
- Jährliche Wartung: 10.000€ (weniger wegen besserer Code-Qualität)
- Technische Schulden: 0€
- **Gesamt (5 Jahre):** 625.000€

**Break-Even:** Nach ~5 Jahren

**Langfristig (10 Jahre):**
- Migration: 480.000€ (inkl. größeres Refactoring nach 5 Jahren)
- Neuimplementierung: 675.000€

**Empfehlung:** Neuimplementierung lohnt sich bei langfristiger Perspektive (>5 Jahre)

---

## 7. Risiko-Analyse (Neuimplementierung)

### 7.1 Top Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Scope Creep | Sehr Hoch | Sehr Hoch | Strikte MVP-Definition, monatliche Reviews |
| Zeitplan-Verzögerungen | Hoch | Hoch | 30% Buffer, agile Entwicklung, Priorisierung |
| Budget-Überschreitung | Hoch | Sehr Hoch | Monatliches Tracking, frühzeitige Eskalation |
| Technische Herausforderungen | Mittel | Hoch | PoCs für kritische Features, Expertenberatung |
| Team-Fluktuation | Mittel | Sehr Hoch | Knowledge Sharing, Dokumentation, Backup-Plan |
| Community-Akzeptanz | Mittel | Hoch | Early Alpha, Community-Feedback, Migration Tools |
| Performance-Probleme | Niedrig | Hoch | Continuous Benchmarking, Load Testing |
| Security-Vulnerabilities | Niedrig | Sehr Hoch | Security Audits, Penetration Testing |

### 7.2 Risiko-Mitigation Strategie

**1. Scope Management:**
- Klare MVP-Definition (siehe Abschnitt 8)
- Feature Freeze nach Phase 7
- Nice-to-Haves für V1.1+

**2. Zeitplan-Management:**
- 2-Wochen Sprints mit klaren Deliverables
- Weekly Progress Reviews
- Monthly Stakeholder Updates
- Kritischer Pfad identifizieren

**3. Qualitäts-Sicherung:**
- Test Coverage >85% enforced
- Automatische Code Quality Checks
- Peer Reviews für alle PRs
- Security Scanning (Snyk, Dependabot)

**4. Community-Management:**
- Monatliche Blog Posts über Fortschritt
- Alpha Release nach Monat 6
- Beta Release nach Monat 10
- Migration Workshops

---

## 8. MVP-Definition (Must-Have für V1.0)

### 8.1 Core Features (Must-Have)

✅ **1. Bundle System**
- Bundle laden und ausführen
- Dashboard Panels anzeigen
- Graphics rendern
- Extension ausführen
- Hot Reload

✅ **2. Replicant System**
- Replicants erstellen/lesen/updaten/löschen
- Client-Server Synchronisation
- Persistence
- Schema Validation
- React/Vue/Svelte Hooks

✅ **3. Message System**
- Messages senden/empfangen
- Acknowledgements
- Type-Safety

✅ **4. Asset System**
- File Upload
- Storage (S3/MinIO)
- Asset Categories
- Basic Processing (Resize, Compress)

✅ **5. Dashboard**
- Bundle Overview
- Replicant Inspector
- Asset Manager
- Settings

✅ **6. Authentication**
- Local Auth (Username/Password)
- OAuth2 (Twitch, Discord)
- RBAC (Admin, Operator, Viewer)

✅ **7. CLI**
- create bundle
- dev server
- build
- deploy

✅ **8. Documentation**
- Getting Started Guide
- Bundle Development Guide
- API Reference
- Migration Guide (V2 → Next)

### 8.2 Features für V1.1+ (Nice-to-Have)

🔄 **V1.1 Features:**
- GraphQL API
- Advanced Analytics
- Electron Desktop App
- Mobile Dashboard
- Bundle Marketplace

🔄 **V1.2 Features:**
- WebRTC Support
- Multi-Instance Clustering
- Advanced Caching
- AI-Assisted Bundle Creation

🔄 **V2.0 Features:**
- Cloud Hosting (SaaS)
- Advanced Networking (P2P)
- Browser Extensions
- Advanced Automation

---

## 9. Technologie-Entscheidungen (Ground-Up)

### 9.1 Backend Framework: Fastify vs. Express

**Entscheidung: Fastify**

**Begründung:**
- 2-3x schneller als Express
- Native TypeScript Support
- Better Plugin System
- Schema-based Validation
- Moderne Architektur

**Vergleich:**
```typescript
// Express (Old Way)
app.get('/api/replicants/:name', (req, res) => {
  const name = req.params.name; // No type safety
  // Manual validation needed
  const replicant = getReplicant(name);
  res.json(replicant);
});

// Fastify (New Way)
fastify.get<{
  Params: { name: string };
  Reply: ReplicantResponse;
}>('/api/replicants/:name', {
  schema: {
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    },
    response: {
      200: ReplicantResponseSchema
    }
  }
}, async (request, reply) => {
  const { name } = request.params; // Type-safe!
  const replicant = await getReplicant(name);
  return replicant; // Auto-validated against schema
});
```

### 9.2 State Management: Zustand vs. Redux

**Entscheidung: Zustand**

**Begründung:**
- Einfacher als Redux
- Weniger Boilerplate
- Type-Safe
- Better DevTools
- Kleinere Bundle-Size

```typescript
// Zustand Store (Simple)
import { create } from 'zustand';

interface BundleStore {
  bundles: Bundle[];
  loadBundles: () => Promise<void>;
  addBundle: (bundle: Bundle) => void;
}

const useBundleStore = create<BundleStore>((set) => ({
  bundles: [],
  loadBundles: async () => {
    const bundles = await fetchBundles();
    set({ bundles });
  },
  addBundle: (bundle) => set((state) => ({ 
    bundles: [...state.bundles, bundle] 
  }))
}));

// Usage
function BundleList() {
  const { bundles, loadBundles } = useBundleStore();
  
  useEffect(() => {
    loadBundles();
  }, []);
  
  return <div>{bundles.map(b => <BundleCard key={b.id} bundle={b} />)}</div>;
}
```

### 9.3 Database: PostgreSQL vs. MongoDB

**Entscheidung: PostgreSQL (Primary) + SQLite (Dev)**

**Begründung:**
- PostgreSQL: ACID, Relational, JSON Support, Best Tooling
- SQLite: Zero-Config für Development
- Prisma unterstützt beide
- Einfacher Wechsel möglich

### 9.4 API: GraphQL vs. REST

**Entscheidung: Beide (GraphQL Primary, REST Fallback)**

**Begründung:**
- GraphQL für flexible Queries
- REST für einfache Endpoints
- GraphQL Subscriptions für Replicants
- REST für Asset Uploads

---

## 10. Code-Beispiele (Neuimplementierung)

### 10.1 Core Server

```typescript
// packages/core/src/server/index.ts

/**
 * NodeCG Next - Core Server
 * 
 * Hauptserver mit Fastify, GraphQL und WebSocket
 * 
 * @module core/server
 */

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainjPlugin } from '@as-integrations/fastify';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { setupWebSocket } from './websocket';
import { BundleManager } from './services/bundle-manager';
import { ReplicantService } from './services/replicant-service';
import type { NodeCGConfig } from '@nodecg/types';

/**
 * NodeCG Server Klasse
 */
export class NodeCGServer {
  private fastify: ReturnType<typeof Fastify>;
  private apollo: ApolloServer;
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private logger: pino.Logger;
  private bundleManager: BundleManager;
  private replicantService: ReplicantService;
  private config: NodeCGConfig;

  /**
   * Initialisiert NodeCG Server
   * 
   * @param config - Server-Konfiguration
   */
  constructor(config: NodeCGConfig) {
    this.config = config;
    
    // Logger initialisieren
    this.logger = pino({
      level: config.logLevel || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    });

    // Prisma Client
    this.prisma = new PrismaClient({
      log: ['warn', 'error']
    });

    // Fastify initialisieren
    this.fastify = Fastify({
      logger: this.logger,
      requestIdLogLabel: 'reqId',
      disableRequestLogging: false
    });

    // Services initialisieren
    this.replicantService = new ReplicantService(this.prisma, this.logger);
    this.bundleManager = new BundleManager(
      config.bundlesPath,
      this.replicantService,
      this.logger
    );
  }

  /**
   * Startet den Server
   */
  async start(): Promise<void> {
    try {
      // Middleware registrieren
      await this.registerMiddleware();
      
      // Routes registrieren
      await this.registerRoutes();
      
      // GraphQL Server starten
      await this.startGraphQL();
      
      // WebSocket Server starten
      await this.startWebSocket();
      
      // Bundles laden
      await this.bundleManager.loadBundles();
      
      // HTTP Server starten
      const address = await this.fastify.listen({
        port: this.config.port || 3000,
        host: this.config.host || '0.0.0.0'
      });
      
      this.logger.info(`🚀 NodeCG Next running at ${address}`);
      this.logger.info(`📊 GraphQL Playground: ${address}/graphql`);
      this.logger.info(`🎨 Dashboard: ${address}/dashboard`);
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Registriert Middleware
   */
  private async registerMiddleware(): Promise<void> {
    // CORS
    await this.fastify.register(fastifyCors, {
      origin: this.config.cors?.allowedOrigins || true,
      credentials: true
    });

    // Security Headers
    await this.fastify.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:']
        }
      }
    });

    // Rate Limiting
    await this.fastify.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '15 minutes'
    });

    // Request Logging
    this.fastify.addHook('onRequest', async (request, reply) => {
      request.log.info({ url: request.url, method: request.method }, 'incoming request');
    });

    // Error Handling
    this.fastify.setErrorHandler((error, request, reply) => {
      request.log.error(error);
      
      reply.status(error.statusCode || 500).send({
        error: error.message,
        statusCode: error.statusCode || 500
      });
    });
  }

  /**
   * Registriert REST Routes
   */
  private async registerRoutes(): Promise<void> {
    // Health Check
    this.fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    });

    // API Routes
    this.fastify.register(async (fastify) => {
      // Replicants API
      fastify.get<{
        Params: { namespace: string; name: string };
      }>('/api/replicants/:namespace/:name', async (request, reply) => {
        const { namespace, name } = request.params;
        const replicant = await this.replicantService.get(namespace, name);
        
        if (!replicant) {
          return reply.code(404).send({ error: 'Replicant not found' });
        }
        
        return replicant;
      });

      // Bundles API
      fastify.get('/api/bundles', async () => {
        return this.bundleManager.getBundles();
      });

      // Assets API
      fastify.post('/api/assets/upload', async (request, reply) => {
        // Asset Upload Logic
        return { success: true };
      });
    }, { prefix: '/api' });

    // Static Files
    this.fastify.register(require('@fastify/static'), {
      root: this.config.publicPath || './public',
      prefix: '/public/'
    });
  }

  /**
   * Startet GraphQL Server
   */
  private async startGraphQL(): Promise<void> {
    this.apollo = new ApolloServer({
      typeDefs: schema,
      resolvers,
      plugins: [
        fastifyApolloDrainjPlugin(this.fastify)
      ]
    });

    await this.apollo.start();

    this.fastify.register(async (fastify) => {
      fastify.post('/graphql', async (request, reply) => {
        const response = await this.apollo.executeOperation({
          query: (request.body as any).query,
          variables: (request.body as any).variables
        });

        reply.send(response);
      });

      fastify.get('/graphql', async (request, reply) => {
        reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>GraphQL Playground</title>
            </head>
            <body>
              <div id="root"></div>
              <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
            </body>
          </html>
        `);
      });
    });
  }

  /**
   * Startet WebSocket Server
   */
  private async startWebSocket(): Promise<void> {
    this.io = new SocketIOServer(this.fastify.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    setupWebSocket(this.io, this.replicantService, this.logger);
  }

  /**
   * Stoppt den Server graceful
   */
  async stop(): Promise<void> {
    this.logger.info('Shutting down gracefully...');
    
    // WebSocket Connections schließen
    this.io.close();
    
    // Database Connections schließen
    await this.prisma.$disconnect();
    
    // HTTP Server schließen
    await this.fastify.close();
    
    this.logger.info('Server stopped');
  }
}

/**
 * CLI Entry Point
 */
if (require.main === module) {
  const config: NodeCGConfig = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    bundlesPath: process.env.BUNDLES_PATH || './bundles',
    publicPath: process.env.PUBLIC_PATH || './public',
    logLevel: (process.env.LOG_LEVEL as any) || 'info'
  };

  const server = new NodeCGServer(config);
  
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful Shutdown
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}
```

### 10.2 Replicant Service (Neu)

```typescript
// packages/core/src/services/replicant-service.ts

/**
 * Replicant Service
 * 
 * Verwaltet alle Replicant-Operationen mit Validierung,
 * Persistence und Real-time Updates.
 * 
 * @module services/replicant-service
 */

import { PrismaClient, Replicant } from '@prisma/client';
import { EventEmitter } from 'events';
import { z, ZodSchema } from 'zod';
import type { Logger } from 'pino';

/**
 * Replicant Options
 */
export interface ReplicantOptions<T = any> {
  defaultValue?: T;
  persistent?: boolean;
  schema?: ZodSchema<T>;
}

/**
 * Replicant Change Event
 */
export interface ReplicantChangeEvent<T = any> {
  namespace: string;
  name: string;
  newValue: T;
  oldValue?: T;
  timestamp: number;
}

/**
 * Replicant Service Implementation
 */
export class ReplicantService extends EventEmitter {
  private prisma: PrismaClient;
  private logger: Logger;
  private cache: Map<string, any> = new Map();
  private schemas: Map<string, ZodSchema> = new Map();

  constructor(prisma: PrismaClient, logger: Logger) {
    super();
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Registriert Replicant
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   * @param options - Replicant-Optionen
   * @returns Aktueller Wert
   */
  async register<T>(
    namespace: string,
    name: string,
    options: ReplicantOptions<T> = {}
  ): Promise<T> {
    const key = this.getKey(namespace, name);
    
    // Schema speichern falls vorhanden
    if (options.schema) {
      this.schemas.set(key, options.schema);
    }

    // Aus DB laden oder Default-Wert verwenden
    const dbReplicant = await this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name }
      }
    });

    let value: T;
    
    if (dbReplicant) {
      value = JSON.parse(dbReplicant.value);
      this.logger.debug(`Loaded replicant ${key} from database`);
    } else if (options.defaultValue !== undefined) {
      value = options.defaultValue;
      
      // In DB speichern wenn persistent
      if (options.persistent) {
        await this.save(namespace, name, value);
      }
      
      this.logger.debug(`Initialized replicant ${key} with default value`);
    } else {
      throw new Error(`Replicant ${key} not found and no default value provided`);
    }

    // In Cache speichern
    this.cache.set(key, value);

    return value;
  }

  /**
   * Holt Replicant-Wert
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   * @returns Aktueller Wert oder null
   */
  async get<T>(namespace: string, name: string): Promise<T | null> {
    const key = this.getKey(namespace, name);
    
    // Aus Cache holen
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Aus DB laden
    const dbReplicant = await this.prisma.replicant.findUnique({
      where: {
        namespace_name: { namespace, name }
      }
    });

    if (!dbReplicant) {
      return null;
    }

    const value = JSON.parse(dbReplicant.value);
    this.cache.set(key, value);
    
    return value;
  }

  /**
   * Setzt Replicant-Wert
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   * @param value - Neuer Wert
   * @param validate - Schema-Validierung durchführen
   * @returns Erfolg
   */
  async set<T>(
    namespace: string,
    name: string,
    value: T,
    validate: boolean = true
  ): Promise<boolean> {
    const key = this.getKey(namespace, name);
    const oldValue = this.cache.get(key);

    // Schema-Validierung
    if (validate) {
      const schema = this.schemas.get(key);
      if (schema) {
        try {
          schema.parse(value);
        } catch (error: any) {
          this.logger.error(`Validation failed for ${key}:`, error.errors);
          throw new Error(`Validation failed: ${error.message}`);
        }
      }
    }

    // In Cache speichern
    this.cache.set(key, value);

    // In DB speichern
    await this.save(namespace, name, value);

    // Change Event emittieren
    const changeEvent: ReplicantChangeEvent<T> = {
      namespace,
      name,
      newValue: value,
      oldValue,
      timestamp: Date.now()
    };

    this.emit('change', changeEvent);
    this.emit(`change:${key}`, changeEvent);

    this.logger.debug(`Replicant ${key} updated`);

    return true;
  }

  /**
   * Speichert Replicant in Datenbank
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   * @param value - Wert
   */
  private async save<T>(
    namespace: string,
    name: string,
    value: T
  ): Promise<void> {
    const valueJson = JSON.stringify(value);

    await this.prisma.replicant.upsert({
      where: {
        namespace_name: { namespace, name }
      },
      update: {
        value: valueJson,
        revision: { increment: 1 }
      },
      create: {
        namespace,
        name,
        value: valueJson
      }
    });
  }

  /**
   * Löscht Replicant
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   */
  async delete(namespace: string, name: string): Promise<void> {
    const key = this.getKey(namespace, name);
    
    // Aus Cache entfernen
    this.cache.delete(key);
    this.schemas.delete(key);

    // Aus DB löschen
    await this.prisma.replicant.delete({
      where: {
        namespace_name: { namespace, name }
      }
    });

    this.logger.debug(`Replicant ${key} deleted`);
  }

  /**
   * Generiert Cache-Key
   * 
   * @param namespace - Bundle-Name
   * @param name - Replicant-Name
   * @returns Cache-Key
   */
  private getKey(namespace: string, name: string): string {
    return `${namespace}:${name}`;
  }

  /**
   * Gibt alle Replicants eines Bundles zurück
   * 
   * @param namespace - Bundle-Name
   * @returns Array von Replicants
   */
  async getByNamespace(namespace: string): Promise<Array<{
    name: string;
    value: any;
  }>> {
    const replicants = await this.prisma.replicant.findMany({
      where: { namespace }
    });

    return replicants.map(r => ({
      name: r.name,
      value: JSON.parse(r.value)
    }));
  }
}
```

Die Dateien wachsen sehr lang - soll ich den Rest in weiteren Dateien fortsetzten?