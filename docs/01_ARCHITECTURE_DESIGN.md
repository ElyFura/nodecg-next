# NodeCG Next - System-Architektur

## Technisches Design für komplette Neuimplementierung

**Version:** 1.0  
**Status:** Design Phase  
**Architektur-Ansatz:** Microservices-Ready, Cloud-Native

---

## 🏗️ High-Level Architektur

### System-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │   Graphics   │  │  Extension   │          │
│  │  (React 18)  │  │  (Framework- │  │  (Node.js)   │          │
│  │              │  │   Agnostic)  │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         │  HTTP/WS        │  WebSocket       │  HTTP/GraphQL    │
│         │  GraphQL        │  WebRTC          │                  │
└─────────┼─────────────────┼──────────────────┼──────────────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼──────────────────┐
│                     API Gateway Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   GraphQL    │  │   REST API   │  │  WebSocket   │          │
│  │   Server     │  │   Endpoints  │  │   Gateway    │          │
│  │  (Apollo)    │  │  (Fastify)   │  │  (Socket.IO) │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  ┌──────▼─────────────────▼──────────────────▼───────┐          │
│  │  Auth Middleware (JWT, OAuth2, RBAC)              │          │
│  ├───────────────────────────────────────────────────┤          │
│  │  Rate Limiting, CORS, Security Headers            │          │
│  └───────────────────────────────────────────────────┘          │
└─────────┬─────────────────┬──────────────────┬──────────────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼──────────────────┐
│                     Core Service Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Replicant    │  │     Bundle      │  │     Plugin      │ │
│  │    Service      │  │     Manager     │  │     System      │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                     │           │
│  ┌────────▼────────┐  ┌───────▼─────────┐  ┌───────▼────────┐ │
│  │     Asset       │  │      User       │  │   Analytics    │ │
│  │    Manager      │  │     Service     │  │    Service     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                     │           │
│           └────────┬───────────┴──────────┬──────────┘           │
│                    │                      │                      │
│           ┌────────▼────────┐    ┌───────▼────────┐            │
│           │   Event Bus     │    │  Message Queue │            │
│           │   (Internal)    │    │   (RabbitMQ)   │            │
│           └─────────────────┘    └────────────────┘            │
└─────────────────────┬────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│                        Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │   Redis Cache   │  │   RabbitMQ      │ │
│  │  (Primary DB)   │  │   (Sessions,    │  │  (Task Queue)   │ │
│  │                 │  │    Pub/Sub)     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   MinIO/S3      │  │   Prometheus    │                      │
│  │  (Assets)       │  │   (Metrics)     │                      │
│  └─────────────────┘  └─────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Komponenten-Architektur

### 1. API Gateway Layer

**Verantwortlichkeiten:**

- Request Routing
- Authentication & Authorization
- Rate Limiting
- CORS & Security Headers
- Request/Response Transformation
- API Versioning

**Technologien:**

- **Fastify** - HTTP Server
- **Apollo Server** - GraphQL
- **Socket.IO** - WebSocket
- **Passport.js** - Authentication

**Dateistruktur:**

```
packages/core/src/gateway/
├── http/
│   ├── server.ts           # Fastify Server Setup
│   ├── middleware/
│   │   ├── auth.ts         # JWT Verification
│   │   ├── rateLimit.ts    # Rate Limiting
│   │   ├── cors.ts         # CORS Configuration
│   │   └── security.ts     # Security Headers
│   └── routes/
│       ├── health.ts       # Health Check
│       ├── api/            # REST API Routes
│       └── assets/         # Asset Upload Routes
├── graphql/
│   ├── server.ts           # Apollo Server
│   ├── schema/             # GraphQL Schema Definitions
│   ├── resolvers/          # GraphQL Resolvers
│   └── subscriptions/      # Real-time Subscriptions
└── websocket/
    ├── server.ts           # Socket.IO Server
    ├── namespaces/         # Dashboard, Graphics, Extension
    ├── rooms.ts            # Room Management
    └── middleware/         # WS Auth Middleware
```

### 2. Core Service Layer

#### 2.1 Replicant Service

**Funktionen:**

- Type-Safe Replicant CRUD
- Schema Validation (Zod)
- Real-Time Synchronization
- Conflict Resolution
- History/Versioning
- Persistence Layer

**Interface:**

```typescript
interface ReplicantService {
  register<T>(namespace: string, name: string, options: ReplicantOptions<T>): Promise<T>;
  get<T>(namespace: string, name: string): Promise<T | null>;
  set<T>(namespace: string, name: string, value: T): Promise<void>;
  subscribe(namespace: string, name: string, callback: (value: any) => void): Unsubscribe;
  delete(namespace: string, name: string): Promise<void>;
  getHistory(namespace: string, name: string, limit: number): Promise<ReplicantHistory[]>;
}
```

**Dateistruktur:**

```
packages/core/src/services/replicant/
├── service.ts              # Main Service Class
├── schema-validator.ts     # Zod Schema Validation
├── sync-manager.ts         # Client-Server Sync
├── conflict-resolver.ts    # Merge Strategies
├── persistence.ts          # Database Persistence
├── cache.ts                # In-Memory Cache
└── history.ts              # Change History Tracking
```

#### 2.2 Bundle Manager

**Funktionen:**

- Bundle Discovery & Loading
- Dependency Resolution
- Lifecycle Management (start, stop, reload)
- Hot Module Replacement
- Bundle Registry
- Configuration Management

**Dateistruktur:**

```
packages/core/src/services/bundle/
├── manager.ts              # Bundle Manager
├── loader.ts               # Bundle Loading
├── dependency-resolver.ts  # Dependency Graph
├── lifecycle.ts            # Start/Stop/Reload
├── hmr.ts                  # Hot Module Replacement
└── registry.ts             # Bundle Registry
```

#### 2.3 Asset Manager

**Funktionen:**

- File Upload (Multipart)
- Storage (S3/MinIO)
- Image Processing (Sharp)
- Audio Processing (FFmpeg)
- CDN Integration
- Asset Categories

**Dateistruktur:**

```
packages/core/src/services/asset/
├── manager.ts              # Asset Manager
├── upload.ts               # Upload Handler
├── storage.ts              # S3/MinIO Client
├── processing/
│   ├── image.ts            # Image Processing
│   └── audio.ts            # Audio Processing
└── cdn.ts                  # CDN Integration
```

#### 2.4 User Service

**Funktionen:**

- User CRUD
- Authentication (Local, OAuth2, LDAP)
- Authorization (RBAC)
- Session Management
- Password Hashing (bcrypt)
- 2FA/MFA (optional)

**Dateistruktur:**

```
packages/core/src/services/user/
├── service.ts              # User Service
├── auth/
│   ├── local.ts            # Username/Password
│   ├── oauth2.ts           # OAuth2 Providers
│   └── ldap.ts             # LDAP/AD (optional)
├── rbac.ts                 # Role-Based Access Control
├── session.ts              # Session Management
└── password.ts             # Password Hashing
```

#### 2.5 Plugin System

**Funktionen:**

- Plugin Discovery & Loading
- Plugin API
- Hook System
- Plugin Configuration
- Plugin Registry

**Dateistruktur:**

```
packages/core/src/services/plugin/
├── manager.ts              # Plugin Manager
├── loader.ts               # Plugin Loader
├── api.ts                  # Plugin API
├── hooks.ts                # Hook System
└── registry.ts             # Plugin Registry
```

### 3. Data Layer

#### 3.1 Database (PostgreSQL + Prisma)

**Schema:**

```prisma
// Prisma Schema
model Replicant {
  id          String   @id @default(cuid())
  namespace   String
  name        String
  value       String   // JSON
  schema      String?  // JSON Schema
  revision    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  history     ReplicantHistory[]

  @@unique([namespace, name])
  @@index([namespace])
}

model ReplicantHistory {
  id            String     @id @default(cuid())
  replicantId   String
  replicant     Replicant  @relation(fields: [replicantId], references: [id], onDelete: Cascade)
  value         String
  changedBy     String?
  changedAt     DateTime   @default(now())

  @@index([replicantId])
}

model User {
  id          String    @id @default(cuid())
  username    String    @unique
  email       String?   @unique
  password    String?
  role        UserRole  @default(VIEWER)
  providers   OAuthProvider[]
  sessions    Session[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum UserRole {
  ADMIN
  OPERATOR
  VIEWER
}

model OAuthProvider {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String   // "twitch", "discord", etc.
  providerId  String
  accessToken String?
  refreshToken String?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([provider, providerId])
  @@index([userId])
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token       String   @unique
  expiresAt   DateTime
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([token])
}

model Asset {
  id          String   @id @default(cuid())
  namespace   String
  category    String
  name        String
  sum         String   // MD5 Checksum
  url         String
  size        Int
  mimeType    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([namespace, category, name])
  @@index([namespace, category])
}

model Bundle {
  id          String   @id @default(cuid())
  name        String   @unique
  version     String
  config      String   // JSON
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 3.2 Cache (Redis)

**Verwendung:**

- Session Storage
- Replicant Cache (Hot Data)
- Rate Limiting Counters
- Pub/Sub für Multi-Instance

**Keys:**

```
sessions:<sessionId>           # Session Data
replicants:<namespace>:<name>  # Replicant Cache
ratelimit:<ip>:<endpoint>      # Rate Limiting
locks:<resource>               # Distributed Locks
```

#### 3.3 Message Queue (RabbitMQ)

**Queues:**

- `bundle.lifecycle` - Bundle Start/Stop/Reload
- `asset.processing` - Image/Audio Processing
- `analytics.events` - Analytics Events
- `webhooks.outgoing` - Webhook Delivery

---

## 🔄 Datenfluss-Diagramme

### 1. Replicant Update Flow

```
┌─────────────┐
│  Dashboard  │ (User ändert Wert)
└──────┬──────┘
       │ 1. WebSocket emit('replicant:update', {name, value})
       ▼
┌─────────────────────┐
│  WebSocket Gateway  │ (Authentifizierung & Validation)
└──────┬──────────────┘
       │ 2. Service Call
       ▼
┌─────────────────────┐
│ Replicant Service   │ (Schema Validation, Persistence)
└──────┬──────────────┘
       │ 3. Database Write
       ▼
┌─────────────────────┐
│   PostgreSQL        │ (Speichern)
└──────┬──────────────┘
       │ 4. Event Emit
       ▼
┌─────────────────────┐
│    Event Bus        │ (Broadcast)
└──────┬──────────────┘
       │ 5. Notify All Subscribers
       ├──────────┬──────────┬──────────┐
       ▼          ▼          ▼          ▼
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │Dashboard │ │Graphics 1│ │Graphics 2│ │Extension │
 └──────────┘ └──────────┘ └──────────┘ └──────────┘
   (Update UI) (Update Display) (Update Display) (Process Event)
```

### 2. Bundle Loading Flow

```
┌─────────────┐
│    CLI      │ (nodecg dev)
└──────┬──────┘
       │ 1. Start Server
       ▼
┌─────────────────────┐
│   Bundle Manager    │
└──────┬──────────────┘
       │ 2. Scan bundles/ Directory
       ▼
┌─────────────────────┐
│ Dependency Resolver │ (Topological Sort)
└──────┬──────────────┘
       │ 3. Load in Order
       ├─────────┬─────────┬─────────┐
       ▼         ▼         ▼         ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Bundle A│ │Bundle B│ │Bundle C│ │Bundle D│
  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
       │          │          │          │
       │ 4. Initialize Extensions
       ├──────────┼──────────┼──────────┤
       ▼          ▼          ▼          ▼
  ┌────────────────────────────────────────┐
  │       NodeCG API Context               │
  │  (Replicants, Messages, Assets, etc.)  │
  └────────────────────────────────────────┘
```

### 3. Asset Upload Flow

```
┌─────────────┐
│  Dashboard  │ (User uploaded Datei)
└──────┬──────┘
       │ 1. HTTP POST /api/assets/upload
       ▼
┌─────────────────────┐
│   API Gateway       │ (Auth Check, Rate Limit)
└──────┬──────────────┘
       │ 2. Forward to Asset Manager
       ▼
┌─────────────────────┐
│   Asset Manager     │
└──────┬──────────────┘
       │ 3. Validate (Type, Size)
       ▼
┌─────────────────────┐
│  Processing Queue   │ (RabbitMQ)
└──────┬──────────────┘
       │ 4. Process Async
       │   (Resize, Compress, etc.)
       ▼
┌─────────────────────┐
│   MinIO/S3          │ (Store File)
└──────┬──────────────┘
       │ 5. Store Metadata
       ▼
┌─────────────────────┐
│   PostgreSQL        │ (Asset Record)
└──────┬──────────────┘
       │ 6. Emit Event
       ▼
┌─────────────────────┐
│    Event Bus        │
└──────┬──────────────┘
       │ 7. Notify Dashboard
       ▼
┌─────────────┐
│  Dashboard  │ (Update Asset List)
└─────────────┘
```

---

## 🔐 Sicherheits-Architektur

### 1. Authentication

**Flow:**

```
1. User → Login Request (username/password or OAuth2)
2. Server → Validate Credentials
3. Server → Generate JWT Token
4. Server → Store Session in Redis
5. Server → Return Token to Client
6. Client → Store Token (localStorage/sessionStorage)
7. Client → Include Token in all subsequent requests (Authorization: Bearer <token>)
8. Server → Validate Token on each request
```

**JWT Payload:**

```json
{
  "sub": "user-id",
  "username": "john_doe",
  "role": "OPERATOR",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 2. Authorization (RBAC)

**Rollen:**

- **ADMIN:** Alle Rechte
- **OPERATOR:** Dashboard, Replicant Updates, Asset Upload
- **VIEWER:** Nur Lesezugriff

**Permissions Matrix:**

| Ressource         | ADMIN | OPERATOR | VIEWER |
| ----------------- | ----- | -------- | ------ |
| Replicant Read    | ✅    | ✅       | ✅     |
| Replicant Write   | ✅    | ✅       | ❌     |
| Bundle Management | ✅    | ❌       | ❌     |
| User Management   | ✅    | ❌       | ❌     |
| Asset Upload      | ✅    | ✅       | ❌     |
| Settings          | ✅    | ❌       | ❌     |

### 3. Security Best Practices

✅ **HTTPS Only** in Production  
✅ **CORS** konfiguriert per Domain-Whitelist  
✅ **Helmet.js** für Security Headers  
✅ **Rate Limiting** pro IP und User  
✅ **SQL Injection Prevention** via Prisma (Parameterized Queries)  
✅ **XSS Prevention** via Content Security Policy  
✅ **CSRF Protection** via Tokens  
✅ **Password Hashing** via bcrypt (10 Rounds)  
✅ **Sensitive Data Encryption** at Rest  
✅ **Audit Logging** für alle kritischen Operationen

---

## 📊 Performance-Architektur

### 1. Caching-Strategie

**Multi-Layer Cache:**

```
┌─────────────────────────────────────┐
│  L1: In-Memory Cache (Node.js Map)  │  <-- Hot Replicants
└──────────────┬──────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────┐
│  L2: Redis Cache                    │  <-- Session, Warm Data
└──────────────┬──────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────┐
│  L3: PostgreSQL Database            │  <-- Cold Data
└─────────────────────────────────────┘
```

**Cache Invalidation:**

- **Write-Through:** Update DB + Cache gleichzeitig
- **TTL:** Automatisches Expiry nach X Sekunden
- **Event-Based:** Invalidierung via Event Bus

### 2. Horizontal Scaling

**Multi-Instance Setup:**

```
         ┌─────────────────┐
         │  Load Balancer  │
         └────────┬─────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Instance 1│ │Instance 2│ │Instance 3│
└─────┬────┘ └─────┬────┘ └─────┬────┘
      │            │            │
      └────────────┼────────────┘
                   │
         ┌─────────▼─────────┐
         │   Redis Cluster   │
         │  (Shared State)   │
         └───────────────────┘
```

**Session Stickiness:**

- Via Load Balancer (Sticky Sessions)
- Oder via Redis (Shared Sessions)

### 3. Database Optimization

**Connection Pooling:**

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
  // Connection Pool
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
});
```

**Query Optimization:**

- Indexes auf häufig abgefragte Felder
- Eager Loading statt N+1 Queries
- Batch Queries wo möglich
- Read Replicas für Read-Heavy Workloads

---

## 🚀 Deployment-Architektur

### Kubernetes Deployment

```yaml
# Simplified K8s Manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodecg-next
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nodecg-next
  template:
    metadata:
      labels:
        app: nodecg-next
    spec:
      containers:
        - name: nodecg-next
          image: nodecg/nodecg-next:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: nodecg-secrets
                  key: database-url
            - name: REDIS_URL
              value: 'redis://redis-service:6379'
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: nodecg-next-service
spec:
  selector:
    app: nodecg-next
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

**Dokument-Version:** 1.0  
**Nächster Review:** Nach PoC Phase 1
