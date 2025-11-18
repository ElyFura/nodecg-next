# NodeCG Next - Technologie-Entscheidungen

## Architecture Decision Records (ADRs)

**Version:** 1.0  
**Status:** Approved  
**Letzte Aktualisierung:** November 2025

---

## 📋 Übersicht

Dieses Dokument enthält alle wichtigen Technologie-Entscheidungen für NodeCG Next mit Begründungen, Alternativen und Trade-offs.

---

## ADR-001: Backend Framework - Fastify statt Express

### Status

✅ **ACCEPTED**

### Kontext

NodeCG V2 nutzt Express.js, das jedoch Performance-Limitierungen hat und nicht optimal für moderne TypeScript-Projekte geeignet ist.

### Entscheidung

**Fastify 5.x** als HTTP-Framework

### Begründung

**Pro Fastify:**

- ⚡ **2-3x schneller** als Express (Benchmarks)
- 📘 **Native TypeScript-Support** - First-class Types
- 🔌 **Modernes Plugin-System** - Better encapsulation
- ✅ **Schema-basierte Validation** - JSON Schema out-of-the-box
- 🚀 **Async/Await native** - Bessere Error Handling
- 📊 **Built-in Logging** - Pino Integration

**Vergleich:**

```typescript
// Express (Alt)
app.get('/api/users/:id', (req, res) => {
  const id = req.params.id; // No type safety!
  // Manual validation needed
  res.json({ id, name: 'John' });
});

// Fastify (Neu)
fastify.get<{
  Params: { id: string };
  Reply: User;
}>(
  '/api/users/:id',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: UserSchema,
      },
    },
  },
  async (request, reply) => {
    const { id } = request.params; // Type-safe!
    return { id, name: 'John' }; // Auto-validated
  }
);
```

**Performance:**

- Express: ~30.000 req/s
- Fastify: ~76.000 req/s
- **2.5x Improvement!**

### Alternativen

**Express.js:**

- ❌ Langsamer
- ❌ Kein Native TypeScript
- ✅ Größtes Ecosystem
- ✅ Am meisten dokumentiert

**Koa.js:**

- ✅ Moderner als Express
- ❌ Kleineres Ecosystem
- ❌ Kein Schema Validation

**NestJS:**

- ✅ Enterprise-ready
- ✅ Dependency Injection
- ❌ Zu opinionated für Framework
- ❌ Größerer Overhead

### Konsequenzen

**Positiv:**

- Bessere Performance
- Type-Safety
- Moderne APIs

**Negativ:**

- Team muss Fastify lernen
- Kleineres Ecosystem als Express
- Einige Express-Middleware nicht kompatibel

### Implementation

```bash
npm install fastify@5 @fastify/cors @fastify/helmet
```

---

## ADR-002: ORM - Prisma statt TypeORM

### Status

✅ **ACCEPTED**

### Kontext

Für Type-Safe Database Access wird ein modernes ORM benötigt.

### Entscheidung

**Prisma 6.x** als ORM

### Begründung

**Pro Prisma:**

- 🎯 **Auto-Generated Types** - Perfect TypeScript Integration
- 📝 **Schema-First** - Deklarative Schema-Definition
- 🔄 **Migrations** - Automatische Migration-Generation
- 🚀 **Performance** - Query Optimization
- 📊 **Introspection** - Existing DB → Prisma Schema
- 🛡️ **Type-Safe Queries** - Compile-time Errors

**Prisma Schema Beispiel:**

```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String?  @unique
  role      UserRole @default(VIEWER)
  sessions  Session[]

  @@index([username])
}

enum UserRole {
  ADMIN
  OPERATOR
  VIEWER
}
```

**Generated TypeScript:**

```typescript
// Automatisch generiert!
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: { sessions: true },
});
// user ist vollständig typisiert! ✅
```

### Alternativen

**TypeORM:**

- ✅ Active Record Pattern
- ❌ Decorator Hell
- ❌ TypeScript Types nicht perfekt
- ❌ Migrations komplizierter

**Sequelize:**

- ❌ Kein TypeScript First-Class
- ❌ Veraltete APIs
- ✅ Größtes Ecosystem

**Drizzle:**

- ✅ Type-Safe wie Prisma
- ❌ Noch jung (weniger Battle-tested)
- ❌ Kleineres Ecosystem

### Konsequenzen

**Positiv:**

- Perfect Type-Safety
- Excellent Developer Experience
- Automatische Migrations

**Negativ:**

- Zusätzlicher Build-Step (Codegen)
- Weniger flexibel als raw SQL
- Query Builder etwas limitiert

---

## ADR-003: Frontend Framework - React 18

### Status

✅ **ACCEPTED**

### Kontext

Dashboard UI benötigt modernes Frontend-Framework.

### Entscheidung

**React 18** mit TypeScript

### Begründung

**Pro React:**

- 🌍 **Größte Community** - Most developers know React
- 🔧 **Bestes Tooling** - DevTools, ESLint, etc.
- 📚 **Umfangreichstes Ecosystem** - Komponenten, Hooks, Libraries
- 🎓 **Viele Ressourcen** - Tutorials, Dokumentation
- ⚡ **Server Components** - React 18+ Feature
- 🧩 **shadcn/ui** - Excellent UI Component Library

**Alternative Frameworks:**

| Framework    | Pro                 | Contra                   |
| ------------ | ------------------- | ------------------------ |
| **Vue 3**    | Einfacher zu lernen | Kleinere Community       |
| **Svelte 5** | Beste Performance   | Sehr kleine Community    |
| **Angular**  | Enterprise-ready    | Zu komplex für Framework |

### Trade-offs

**React wählen bedeutet:**

- ✅ Maximale Developer-Verfügbarkeit
- ✅ Best Practices etabliert
- ⚠️ Größere Bundle-Size als Svelte
- ⚠️ Mehr Boilerplate als Vue

### Implementation

```bash
npm install react@18 react-dom@18
npm install @types/react @types/react-dom
```

---

## ADR-004: State Management - Zustand

### Status

✅ **ACCEPTED**

### Kontext

React benötigt State Management für globale State.

### Entscheidung

**Zustand** als State Management Library

### Begründung

**Pro Zustand:**

- 🎯 **Einfach** - Minimale API
- 📦 **Klein** - <1KB gzipped
- 🔧 **Kein Boilerplate** - Im Gegensatz zu Redux
- 📘 **Type-Safe** - Perfect TypeScript Support
- 🪝 **Hooks-Based** - Idiomatisches React

**Zustand Beispiel:**

```typescript
import { create } from 'zustand';

interface BundleStore {
  bundles: Bundle[];
  loadBundles: () => Promise<void>;
}

const useBundleStore = create<BundleStore>((set) => ({
  bundles: [],
  loadBundles: async () => {
    const bundles = await fetchBundles();
    set({ bundles });
  },
}));

// Usage
function BundleList() {
  const { bundles, loadBundles } = useBundleStore();
  // ...
}
```

### Alternativen

**Redux Toolkit:**

- ✅ Standard in Enterprise
- ❌ Viel Boilerplate
- ❌ Steeper Learning Curve

**Jotai:**

- ✅ Atomic State
- ❌ Zu anders von Redux (Team-Verwirrung)

**MobX:**

- ✅ Observable Pattern
- ❌ Magic (Proxies)
- ❌ Weniger populär

### Konsequenzen

- Einfachere State Management
- Weniger Code zu schreiben
- Team muss Zustand lernen (aber sehr einfach)

---

## ADR-005: Build Tool - Vite

### Status

✅ **ACCEPTED**

### Kontext

Schnelle Build-Zeiten kritisch für Developer Experience.

### Entscheidung

**Vite 6.x** als Build Tool

### Begründung

**Pro Vite:**

- ⚡ **Instant Start** - <3 Sekunden Dev Server
- 🔥 **HMR <100ms** - Fast Hot Module Replacement
- 📦 **ESM Native** - Moderne Module-System
- 🎯 **Optimized Production** - Rollup-based Builds
- 🔌 **Plugin Ecosystem** - Viele Plugins verfügbar

**Performance Vergleich:**

```
Dev Server Start:
├─ Webpack: ~15 Sekunden ❌
├─ Parcel:  ~8 Sekunden  ⚠️
└─ Vite:    <3 Sekunden  ✅

HMR:
├─ Webpack: 500-1000ms ❌
├─ Parcel:  300-500ms  ⚠️
└─ Vite:    <100ms     ✅
```

### Alternativen

**Webpack 5:**

- ✅ Most mature
- ❌ Langsam
- ❌ Komplexe Config

**Turbopack:**

- ✅ Sehr schnell
- ❌ Noch Alpha/Beta
- ❌ Next.js-spezifisch

**esbuild:**

- ✅ Extrem schnell
- ❌ Kein HMR out-of-box
- ❌ Plugin-System unreif

---

## ADR-006: Database - PostgreSQL

### Status

✅ **ACCEPTED**

### Kontext

Production-ready Datenbank mit ACID-Properties benötigt.

### Entscheidung

**PostgreSQL 16+** (Primary), **SQLite** (Development)

### Begründung

**Pro PostgreSQL:**

- 🛡️ **ACID Compliant** - Data Integrity
- 📊 **JSON Support** - Native JSONB
- 🔍 **Full-Text Search** - Built-in
- 📈 **Scalable** - Handles large datasets
- 🔒 **Mature** - Battle-tested
- 🆓 **Open Source** - No Licensing Costs

**Pro SQLite (Dev):**

- ⚡ **Zero Config** - File-based
- 🚀 **Fast for Development**
- 📦 **Embedded** - No separate server

### Alternativen

**MySQL:**

- ✅ Populär
- ❌ Weniger Features als PostgreSQL
- ❌ JSON Support nicht so gut

**MongoDB:**

- ✅ Schema-less
- ❌ Keine ACID (Multi-Document)
- ❌ Nicht ideal für relationale Daten

**CockroachDB:**

- ✅ Distributed SQL
- ❌ Overkill für meiste Deployments
- ❌ Zusätzliche Komplexität

---

## ADR-007: Caching - Redis

### Status

✅ **ACCEPTED**

### Kontext

In-Memory Cache für Performance benötigt.

### Entscheidung

**Redis 7.x** als Cache & Pub/Sub

### Begründung

**Verwendung:**

- Session Storage
- Replicant Cache (Hot Data)
- Rate Limiting Counters
- Pub/Sub für Multi-Instance

**Pro Redis:**

- ⚡ **Sehr schnell** - In-Memory
- 🔄 **Pub/Sub** - Real-time messaging
- 📊 **Datenstrukturen** - Lists, Sets, Hashes
- 🔐 **Persistence** - Optional AOF/RDB
- 🌐 **Cluster** - Horizontal Scaling

### Alternativen

**Memcached:**

- ✅ Einfacher
- ❌ Keine Datenstrukturen
- ❌ Kein Pub/Sub

**Dragonfly:**

- ✅ Redis-kompatibel
- ✅ Bessere Performance
- ❌ Noch neu

---

## ADR-008: Message Queue - RabbitMQ

### Status

✅ **ACCEPTED**

### Kontext

Asynchrone Task-Verarbeitung für Asset Processing, etc.

### Entscheidung

**RabbitMQ 3.x** als Message Broker

### Begründung

**Use Cases:**

- Asset Processing (Image Resize, etc.)
- Background Jobs
- Webhook Delivery
- Analytics Events

**Pro RabbitMQ:**

- 🔄 **AMQP Protocol** - Standard
- 🛡️ **Reliable** - Message Persistence
- 📊 **Management UI** - Built-in Dashboard
- 🔌 **Flexible Routing** - Exchanges, Queues
- 📚 **Mature** - Battle-tested

### Alternativen

**Redis (als Queue):**

- ✅ Einfacher
- ❌ Nicht designed für Queues
- ❌ Keine Message Persistence

**Apache Kafka:**

- ✅ High Throughput
- ❌ Overkill für unsere Needs
- ❌ Komplexer Setup

**AWS SQS:**

- ✅ Managed Service
- ❌ Vendor Lock-in
- ❌ Nicht self-hostable

---

## ADR-009: Testing Framework - Vitest

### Status

✅ **ACCEPTED**

### Kontext

Moderne Testing-Lösung für TypeScript benötigt.

### Entscheidung

**Vitest** für Unit/Integration Tests

### Begründung

**Pro Vitest:**

- ⚡ **Schnell** - Vite-powered
- 🔧 **Compatible** - Jest-like API
- 📘 **TypeScript** - First-class Support
- 🎯 **ESM Native** - No transpilation needed
- 🔌 **Vite Config** - Shared with Vite

**Beispiel:**

```typescript
import { describe, it, expect } from 'vitest';

describe('ReplicantService', () => {
  it('should create replicant', async () => {
    const service = new ReplicantService();
    const result = await service.register('test', 'myRep', {
      defaultValue: 0,
    });
    expect(result).toBe(0);
  });
});
```

### Alternativen

**Jest:**

- ✅ Most Popular
- ❌ ESM Support problematisch
- ❌ Langsamer

**Mocha + Chai:**

- ✅ Flexibel
- ❌ Mehr Setup
- ❌ Nicht Type-Safe

---

## ADR-010: E2E Testing - Playwright

### Status

✅ **ACCEPTED**

### Kontext

End-to-End Tests für Dashboard benötigt.

### Entscheidung

**Playwright** für E2E Tests

### Begründung

**Pro Playwright:**

- 🌐 **Multi-Browser** - Chrome, Firefox, Safari
- 🎯 **Auto-Wait** - Intelligentes Warten
- 📸 **Screenshots** - Visual Regression
- 🔍 **Debugging** - Excellent DevTools
- 🚀 **Parallel** - Fast Execution

### Alternativen

**Cypress:**

- ✅ Bessere DX
- ❌ Nur Chromium
- ❌ Langsamer

**Puppeteer:**

- ✅ Lightweight
- ❌ Nur Chrome
- ❌ Kein Auto-Wait

---

## 📊 Tech-Stack Zusammenfassung

### Backend

```yaml
Framework: Fastify 5.x
ORM: Prisma 6.x
Database: PostgreSQL 16 + SQLite (Dev)
Cache: Redis 7.x
Message Queue: RabbitMQ 3.x
WebSocket: Socket.IO 4.x
GraphQL: Apollo Server 4.x
```

### Frontend

```yaml
Framework: React 18
State: Zustand
Build: Vite 6.x
UI: shadcn/ui + Tailwind CSS
Data Fetching: TanStack Query
Routing: TanStack Router
```

### Testing

```yaml
Unit/Integration: Vitest
E2E: Playwright
Load Testing: k6
Security: Snyk
```

### DevOps

```yaml
Container: Docker
Orchestration: Kubernetes
CI/CD: GitHub Actions
Monitoring: Prometheus + Grafana
Logging: Pino
Tracing: OpenTelemetry
```

---

**Dokument-Version:** 1.0  
**Status:** Approved  
**Nächstes Review:** Nach Phase 2
