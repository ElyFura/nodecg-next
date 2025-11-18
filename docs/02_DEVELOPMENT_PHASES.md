# NodeCG Next - Entwicklungsphasen

## Detaillierter Plan für 10 Entwicklungsphasen

**Version:** 1.0  
**Gesamtdauer:** 12-14 Monate  
**Aufwand:** 4.080-6.120 Stunden

---

## 📋 Phasen-Übersicht

| Phase | Name                 | Dauer    | Aufwand (h) | Status     |
| ----- | -------------------- | -------- | ----------- | ---------- |
| 1     | Core Foundation      | 3 Monate | 480-720     | 🔵 Geplant |
| 2     | Replicant System V2  | 2 Monate | 400-600     | 🔵 Geplant |
| 3     | Bundle System        | 2 Monate | 400-600     | 🔵 Geplant |
| 4     | Auth & Authorization | 2 Monate | 320-480     | 🔵 Geplant |
| 5     | Dashboard & UI       | 3 Monate | 640-960     | 🔵 Geplant |
| 6     | GraphQL API          | 2 Monate | 320-480     | 🔵 Geplant |
| 7     | Plugin System        | 2 Monate | 400-600     | 🔵 Geplant |
| 8     | Observability & Prod | 2 Monate | 320-480     | 🔵 Geplant |
| 9     | Docs & Testing       | 3 Monate | 480-720     | 🔵 Geplant |
| 10    | Beta & Launch        | 4 Monate | 320-480     | 🔵 Geplant |

**Hinweis:** Phasen überlappen sich teilweise. Siehe Timeline-Diagramm unten.

---

## Phase 1: Core Foundation (Monate 1-3)

### Ziele

- Lauffähiger Server mit Datenbank
- WebSocket funktionsfähig
- Basis-Tests (>80% Coverage)
- Docker-Setup

### Aufgaben

#### 1.1 Project Setup (Woche 1-2, 40h)

```bash
# Monorepo Setup
- pnpm workspace erstellen
- Turborepo konfigurieren
- TypeScript Base-Config
- ESLint + Prettier
- Git Hooks (Husky)
```

**Deliverables:**

- ✅ Repository mit Monorepo-Struktur
- ✅ CI/CD Pipeline (GitHub Actions)
- ✅ Development Scripts

#### 1.2 Core Server (Woche 3-6, 160h)

```bash
# Fastify Server
- Server Setup
- Middleware Pipeline
- Error Handling
- Logging (Pino)
- Configuration (Zod)
- Health Check Endpoints
```

**Datei:** `packages/core/src/server/index.ts`

**Code-Struktur:**

```typescript
// packages/core/src/server/index.ts
export class NodeCGServer {
  private fastify: FastifyInstance;
  private config: NodeCGConfig;

  constructor(config: NodeCGConfig) {
    this.config = config;
    this.fastify = Fastify({ logger: true });
  }

  async start(): Promise<void> {
    await this.registerMiddleware();
    await this.registerRoutes();
    await this.fastify.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }
}
```

**Deliverables:**

- ✅ HTTP Server läuft
- ✅ Middleware funktionieren
- ✅ Health Check: `GET /health`

#### 1.3 Database Layer (Woche 7-10, 200h)

```bash
# Prisma Setup
- Schema Design
- Migrations erstellen
- Repository Pattern
- Connection Pooling
- Multi-Tenant Support (optional)
```

**Dateien:**

- `packages/core/prisma/schema.prisma`
- `packages/core/src/database/client.ts`
- `packages/core/src/database/repositories/`

**Deliverables:**

- ✅ Prisma funktioniert
- ✅ Migrations laufen
- ✅ Repository Pattern implementiert

#### 1.4 WebSocket Layer (Woche 11-12, 80h)

```bash
# Socket.IO V4
- Server Setup
- Connection Management
- Namespaces (dashboard, graphics, extension)
- Room System
- Auth Middleware
```

**Datei:** `packages/core/src/websocket/server.ts`

**Deliverables:**

- ✅ WebSocket funktioniert
- ✅ Namespaces erstellt
- ✅ Auth Middleware integriert

### Meilenstein Phase 1

**Definition of Done:**

- [x] Server startet ohne Fehler
- [x] Database-Migrations laufen
- [x] WebSocket-Verbindung funktioniert
- [x] Health Check liefert 200 OK
- [x] Docker Image baut
- [x] Tests >80% Coverage
- [x] Dokumentation vorhanden

---

## Phase 2: Replicant System V2 (Monate 2-4)

### Ziele

- Type-Safe Replicant API
- Client-Server Synchronisation
- Schema Validation
- Performance: <10ms Latenz

### Aufgaben

#### 2.1 Replicant Core (Woche 1-4, 200h)

```bash
# Core Functionality
- Replicant Service Class
- CRUD Operations
- Schema Validation (Zod)
- Persistence Layer
- History/Versioning
- Cache Layer
```

**Datei:** `packages/core/src/services/replicant/service.ts`

**Interface:**

```typescript
export class ReplicantService {
  async register<T>(namespace: string, name: string, options: ReplicantOptions<T>): Promise<T>;

  async get<T>(namespace: string, name: string): Promise<T | null>;

  async set<T>(namespace: string, name: string, value: T): Promise<void>;

  subscribe(namespace: string, name: string, callback: (value: any) => void): Unsubscribe;
}
```

**Deliverables:**

- ✅ Replicant CRUD funktioniert
- ✅ Schema Validation aktiv
- ✅ Persistence funktioniert

#### 2.2 Synchronisation (Woche 5-6, 120h)

```bash
# Client-Server Sync
- Delta Updates (nur Änderungen)
- Conflict Resolution
- Optimistic Updates
- Compression (gzip)
- Reconnection Logic
```

**Datei:** `packages/core/src/services/replicant/sync-manager.ts`

**Deliverables:**

- ✅ Sync <10ms Latenz
- ✅ Conflict Resolution funktioniert
- ✅ Reconnect ohne Datenverlust

#### 2.3 Client API (Woche 7-8, 80h)

```bash
# Framework Hooks
- React Hooks
- Vue Composables
- Svelte Stores
- Vanilla JS API
```

**Dateien:**

- `packages/client/src/hooks/react/useReplicant.ts`
- `packages/client/src/hooks/vue/useReplicant.ts`
- `packages/client/src/hooks/svelte/replicantStore.ts`

**React Hook Beispiel:**

```typescript
// packages/client/src/hooks/react/useReplicant.ts
export function useReplicant<T>(name: string, defaultValue?: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const unsubscribe = nodecg.Replicant(name).on('change', setValue);
    return () => unsubscribe();
  }, [name]);

  const updateValue = useCallback(
    (newValue: T) => {
      nodecg.Replicant(name).value = newValue;
    },
    [name]
  );

  return [value, updateValue];
}
```

**Deliverables:**

- ✅ React Hooks funktionieren
- ✅ Vue Composables funktionieren
- ✅ Svelte Stores funktionieren

### Meilenstein Phase 2

**Definition of Done:**

- [x] Replicants können erstellt werden
- [x] Client-Server Sync funktioniert
- [x] Latenz <10ms (p95)
- [x] Schema Validation aktiv
- [x] Framework Hooks verfügbar
- [x] Tests >85% Coverage
- [x] Benchmark-Tests vorhanden

---

## Phase 3: Bundle System (Monate 3-5)

### Ziele

- Bundle Discovery & Loading
- CLI Tool (create, dev, build)
- Hot Module Replacement
- Template System

### Aufgaben

#### 3.1 Bundle Manager (Woche 1-3, 180h)

```bash
# Core Bundle Management
- Bundle Discovery
- Dependency Resolution
- Lifecycle Management
- Hot Reload Logic
- Bundle Registry
```

**Datei:** `packages/core/src/services/bundle/manager.ts`

**Deliverables:**

- ✅ Bundles werden geladen
- ✅ Dependencies aufgelöst
- ✅ Hot Reload funktioniert

#### 3.2 CLI Tool (Woche 4-6, 160h)

```bash
# CLI Commands
- create: Bundle scaffolding
- dev: Development server
- build: Production build
- deploy: Deployment helper
```

**Dateien:**

- `packages/cli/src/commands/create.ts`
- `packages/cli/src/commands/dev.ts`
- `packages/cli/src/commands/build.ts`

**Usage:**

```bash
# Bundle erstellen
$ npx create-nodecg-bundle my-bundle --template react

# Development starten
$ cd my-bundle
$ nodecg dev

# Production Build
$ nodecg build
```

**Deliverables:**

- ✅ CLI funktioniert
- ✅ Templates verfügbar (React, Vue, Minimal)
- ✅ Dev Server mit HMR

#### 3.3 Asset Management (Woche 7-8, 60h)

```bash
# Asset System
- Upload Handler
- S3/MinIO Integration
- Image Processing
- CDN Support
```

**Datei:** `packages/core/src/services/asset/manager.ts`

**Deliverables:**

- ✅ File Upload funktioniert
- ✅ S3/MinIO integriert
- ✅ Image Processing aktiv

### Meilenstein Phase 3

**Definition of Done:**

- [x] CLI: `create-nodecg-bundle` funktioniert
- [x] Hot Reload <100ms
- [x] 3 Bundle-Templates verfügbar
- [x] Asset Upload funktioniert
- [x] Dokumentation: Bundle Development Guide
- [x] Tests >80% Coverage

---

## Phase 4: Authentication & Authorization (Monate 4-6)

### Ziele

- JWT Token System
- OAuth2 Provider
- RBAC implementiert
- Audit Logging

### Aufgaben

#### 4.1 Authentication (Woche 1-4, 200h)

```bash
# Auth System
- Local Auth (Username/Password)
- OAuth2 (Twitch, Discord, Google, GitHub)
- JWT Token Generation
- Session Management
- Password Hashing (bcrypt)
```

**Dateien:**

- `packages/core/src/services/user/auth/local.ts`
- `packages/core/src/services/user/auth/oauth2.ts`

**Deliverables:**

- ✅ Local Auth funktioniert
- ✅ OAuth2 Providers integriert
- ✅ JWT Tokens funktionieren

#### 4.2 Authorization (Woche 5-6, 80h)

```bash
# RBAC
- Role Definition (Admin, Operator, Viewer)
- Permission Checks
- Middleware Integration
- Resource-Level Permissions
```

**Datei:** `packages/core/src/services/user/rbac.ts`

**Deliverables:**

- ✅ RBAC funktioniert
- ✅ Permissions enforced
- ✅ Middleware integriert

#### 4.3 Audit Logging (Woche 7-8, 40h)

```bash
# Audit System
- Log alle kritischen Operationen
- Structured Logging
- Log Retention
- Log Query API
```

**Deliverables:**

- ✅ Audit Logs funktionieren
- ✅ Query API vorhanden

### Meilenstein Phase 4

**Definition of Done:**

- [x] OAuth2 funktioniert
- [x] RBAC implementiert
- [x] Audit Logs vorhanden
- [x] Security Audit bestanden
- [x] Penetration Test durchgeführt
- [x] Tests >85% Coverage

---

## Phase 5-10: Siehe separate Dokumente

**Folgende Phasen werden in separaten Dokumenten detailliert:**

### Phase 5: Dashboard & UI (3 Monate)

- React Dashboard
- UI Component Library
- Responsive Design
- Dark Mode

### Phase 6: GraphQL API (2 Monate)

- Apollo Server
- Schema Definition
- Subscriptions
- Code Generation

### Phase 7: Plugin System (2 Monate)

- Plugin Loader
- Plugin API
- Core Plugins

### Phase 8: Observability (2 Monate)

- OpenTelemetry
- Prometheus Metrics
- Production Readiness

### Phase 9: Docs & Testing (3 Monate)

- VitePress Documentation
- E2E Tests
- Migration Tools

### Phase 10: Beta & Launch (4 Monate)

- Community Testing
- Bug Fixes
- Launch Event

---

## 📊 Timeline-Diagramm

```
Monat:  1   2   3   4   5   6   7   8   9   10  11  12  13  14
Phase 1: [=======]
Phase 2:     [=======]
Phase 3:         [=======]
Phase 4:             [=======]
Phase 5:                 [===========]
Phase 6:                     [=======]
Phase 7:                         [=======]
Phase 8:                             [=======]
Phase 9:                                 [===========]
Phase 10:                                    [===============]

Meilensteine:
M1 (M3):  Alpha Internal
M2 (M6):  Alpha Community
M3 (M10): Beta Release
M4 (M12): Release Candidate
M5 (M14): V1.0.0 Launch
```

---

**Dokument-Version:** 1.0  
**Nächste Phasen:** Siehe separate Dokumente für Phase 5-10
