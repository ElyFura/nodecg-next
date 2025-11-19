# Replicant System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Server API (ReplicantService)](#server-api-replicantservice)
4. [REST API](#rest-api)
5. [WebSocket API](#websocket-api)
6. [Client Libraries](#client-libraries)
7. [Schema Validation](#schema-validation)
8. [Performance](#performance)
9. [Best Practices](#best-practices)
10. [Migration from NodeCG v2](#migration-from-nodecg-v2)

---

## Overview

Replicants are the core state management system in NodeCG Next. They provide synchronized, persistent, type-safe state objects that can be shared between:

- **Server** (Extensions)
- **Dashboard** (React UI)
- **Graphics** (Browser overlays)
- **Client applications** (External tools)

### Key Features

- ✅ **Type-Safe**: Full TypeScript support with generic types
- ✅ **Validated**: Runtime validation with Zod schemas
- ✅ **Persistent**: Automatically saved to SQLite/PostgreSQL
- ✅ **Synchronized**: Real-time updates via WebSocket
- ✅ **Observable**: Subscribe to changes with callbacks
- ✅ **Versioned**: Complete revision history tracking
- ✅ **RESTful**: HTTP endpoints for CRUD operations

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  Dashboard (React) │ Graphics (Browser) │ Extensions (Node) │
└─────────────────────────────────────────────────────────────┘
                              ↕
              WebSocket (Subscribe/Update/Sync)
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     Replicant System                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ SyncManager - Real-time broadcasting                   │ │
│  │ ReplicantService - Business logic & validation         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  • In-Memory Cache (fast reads <10ms)                       │
│  • Prisma ORM (database access)                             │
│  • SQLite/PostgreSQL (persistence)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Namespaces

Replicants are organized by namespace, typically your bundle name:

```typescript
// All replicants for 'my-overlay' bundle
await service.register('my-overlay', 'currentScore', { defaultValue: 0 });
await service.register('my-overlay', 'teamName', { defaultValue: 'Team A' });
```

### Persistence

Replicants are persistent by default, surviving server restarts:

```typescript
// Persistent (default) - saved to database
await service.register('my-bundle', 'settings', {
  defaultValue: { volume: 50 },
  persistent: true, // default
});

// Non-persistent - memory only
await service.register('my-bundle', 'tempData', {
  defaultValue: {},
  persistent: false,
});
```

### Revisions

Every change creates a new revision with timestamp and author:

```typescript
await service.set('my-bundle', 'counter', 1, 'user-123');
await service.set('my-bundle', 'counter', 2, 'user-456');

const history = await service.getHistory('my-bundle', 'counter');
// [
//   { value: 2, revision: 1, changedBy: 'user-456', changedAt: Date },
//   { value: 1, revision: 0, changedBy: 'user-123', changedAt: Date }
// ]
```

---

## Server API (ReplicantService)

### Import

```typescript
import { ReplicantService } from '@nodecg/core/services/replicant';
import { getPrismaClient } from '@nodecg/core/database/client';
import { getEventBus } from '@nodecg/core/utils/event-bus';
import { createLogger } from '@nodecg/core/utils/logger';
```

### Initialization

```typescript
const logger = createLogger({ level: 'info' });
const prisma = getPrismaClient(logger);
const eventBus = getEventBus();

const service = new ReplicantService(prisma, config, logger, eventBus);
await service.initialize();

// Always shutdown when done
await service.shutdown();
```

### Methods

#### `register<T>(namespace, name, options): Promise<T>`

Register a replicant with optional default value and schema.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name
- `options` (ReplicantOptions):
  - `defaultValue?: T`: Initial value if not in database
  - `persistent?: boolean`: Save to database (default: true)
  - `schema?: ZodSchema<T>`: Zod validation schema
  - `schemaString?: string`: Schema as JSON string (for storage)

**Returns:** Current value of type `T`

**Example:**

```typescript
const score = await service.register<number>('game', 'score', {
  defaultValue: 0,
  persistent: true,
});
```

#### `get<T>(namespace, name): Promise<T | null>`

Get current replicant value.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name

**Returns:** Current value or `null` if not found

**Example:**

```typescript
const score = await service.get<number>('game', 'score');
if (score === null) {
  console.log('Replicant not found');
}
```

#### `set<T>(namespace, name, value, changedBy?, validate?): Promise<boolean>`

Update replicant value.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name
- `value` (T): New value
- `changedBy?` (string): User/system identifier
- `validate?` (boolean): Run schema validation (default: true)

**Returns:** `true` on success

**Throws:** `ValidationError` if validation fails

**Example:**

```typescript
await service.set('game', 'score', 100, 'admin-user');
```

#### `delete(namespace, name): Promise<void>`

Delete a replicant permanently.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name

**Example:**

```typescript
await service.delete('game', 'oldReplicant');
```

#### `subscribe(namespace, name, callback): () => void`

Subscribe to replicant changes.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name
- `callback` (function): `(event: ReplicantChangeEvent) => void`

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = service.subscribe('game', 'score', (event) => {
  console.log('Score changed:', event.oldValue, '->', event.newValue);
  console.log('Changed by:', event.changedBy);
  console.log('Revision:', event.revision);
});

// Later, clean up
unsubscribe();
```

#### `getHistory(namespace, name, limit?): Promise<HistoryEntry[]>`

Get replicant revision history.

**Parameters:**

- `namespace` (string): Bundle namespace
- `name` (string): Replicant name
- `limit?` (number): Max entries (default: 10)

**Returns:** Array of history entries (most recent first)

**Example:**

```typescript
const history = await service.getHistory('game', 'score', 20);
history.forEach((entry) => {
  console.log(`Rev ${entry.revision}: ${entry.value} by ${entry.changedBy}`);
});
```

#### `getByNamespace(namespace): Promise<ReplicantMeta[]>`

Get all replicants in a namespace.

**Parameters:**

- `namespace` (string): Bundle namespace

**Returns:** Array of replicant metadata

**Example:**

```typescript
const replicants = await service.getByNamespace('game');
replicants.forEach((rep) => {
  console.log(`${rep.name}: rev ${rep.revision}, schema: ${rep.hasSchema}`);
});
```

#### `getAll(): Promise<ReplicantMeta[]>`

Get all replicants across all namespaces (admin only).

**Returns:** Array of all replicant metadata

**Example:**

```typescript
const allReplicants = await service.getAll();
console.log(`Total replicants: ${allReplicants.length}`);
```

### Types

```typescript
interface ReplicantOptions<T = any> {
  defaultValue?: T;
  persistent?: boolean;
  schema?: ZodSchema<T>;
  schemaString?: string;
}

interface ReplicantChangeEvent<T = any> {
  namespace: string;
  name: string;
  newValue: T;
  oldValue?: T;
  revision: number;
  timestamp: number;
  changedBy?: string;
}

interface ReplicantMeta {
  namespace: string;
  name: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  hasSchema: boolean;
}
```

---

## REST API

All REST endpoints require authentication via Bearer token.

### Base URL

```
http://localhost:9090/api/replicants
```

### Authentication

Include JWT token in Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### `GET /api/replicants`

List all replicants (admin only).

**Response:**

```json
{
  "replicants": [
    {
      "namespace": "game",
      "name": "score",
      "revision": 5,
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-01T12:05:00Z",
      "hasSchema": true
    }
  ]
}
```

#### `GET /api/replicants/:namespace`

List replicants in a namespace.

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9090/api/replicants/game
```

**Response:**

```json
{
  "replicants": [
    {
      "namespace": "game",
      "name": "score",
      "revision": 5,
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-01T12:05:00Z",
      "hasSchema": false
    },
    {
      "namespace": "game",
      "name": "timer",
      "revision": 2,
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-01T12:02:00Z",
      "hasSchema": true
    }
  ]
}
```

#### `GET /api/replicants/:namespace/:name`

Get specific replicant value.

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9090/api/replicants/game/score
```

**Response:**

```json
{
  "namespace": "game",
  "name": "score",
  "value": 100
}
```

**Error (404):**

```json
{
  "error": "Replicant not found"
}
```

#### `PUT /api/replicants/:namespace/:name`

Update replicant value (operator role required).

**Request Body:**

```json
{
  "value": { "home": 10, "away": 8 }
}
```

**Example:**

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 200}' \
  http://localhost:9090/api/replicants/game/score
```

**Response:**

```json
{
  "namespace": "game",
  "name": "score",
  "value": 200
}
```

**Error (400 - Validation):**

```json
{
  "error": "Validation failed for game:score"
}
```

#### `DELETE /api/replicants/:namespace/:name`

Delete replicant (operator role required).

**Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:9090/api/replicants/game/oldScore
```

**Response:**

```json
{
  "success": true
}
```

#### `GET /api/replicants/:namespace/:name/history?limit=20`

Get replicant history.

**Query Parameters:**

- `limit` (number): Max entries (default: 50)

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:9090/api/replicants/game/score/history?limit=10"
```

**Response:**

```json
{
  "history": [
    {
      "value": 200,
      "revision": 3,
      "changedBy": "admin",
      "changedAt": "2025-01-01T12:10:00Z"
    },
    {
      "value": 100,
      "revision": 2,
      "changedBy": "system",
      "changedAt": "2025-01-01T12:05:00Z"
    }
  ]
}
```

### Error Codes

| Code | Description                                             |
| ---- | ------------------------------------------------------- |
| 400  | Bad Request (invalid JSON, validation error)            |
| 401  | Unauthorized (invalid/missing token)                    |
| 403  | Forbidden (insufficient permissions)                    |
| 404  | Not Found (replicant doesn't exist)                     |
| 500  | Internal Server Error                                   |
| 503  | Service Unavailable (Replicant service not initialized) |

---

## WebSocket API

Real-time replicant synchronization via Socket.IO.

### Namespaces

Connect to one of these Socket.IO namespaces:

- `/dashboard` - Dashboard panels
- `/graphics` - Graphics overlays
- `/extension` - Extensions/integrations

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:9090/dashboard');
```

### Client Events (Emitted by Client)

#### `replicant:subscribe`

Subscribe to replicant updates.

**Payload:**

```typescript
{
  namespace: string;
  name: string;
}
```

**Example:**

```typescript
socket.emit('replicant:subscribe', {
  namespace: 'game',
  name: 'score',
});
```

#### `replicant:unsubscribe`

Unsubscribe from replicant updates.

**Payload:**

```typescript
{
  namespace: string;
  name: string;
}
```

**Example:**

```typescript
socket.emit('replicant:unsubscribe', {
  namespace: 'game',
  name: 'score',
});
```

#### `replicant:update`

Update replicant value from client.

**Payload:**

```typescript
{
  namespace: string;
  name: string;
  value: any;
  revision?: number;
}
```

**Example:**

```typescript
socket.emit('replicant:update', {
  namespace: 'game',
  name: 'score',
  value: 150,
});
```

### Server Events (Received by Client)

#### `replicant:sync`

Initial value after subscription (full sync).

**Payload:**

```typescript
{
  type: 'full-sync';
  namespace: string;
  name: string;
  value: any;
  revision: number;
  timestamp: number;
  checksum: string; // MD5 hash for integrity
}
```

**Example:**

```typescript
socket.on('replicant:sync', (message) => {
  console.log('Initial value:', message.value);
  console.log('Checksum:', message.checksum);
});
```

#### `replicant:change`

Replicant value changed.

**Payload:**

```typescript
{
  type: 'update';
  namespace: string;
  name: string;
  value: any;
  revision: number;
  timestamp: number;
  checksum: string;
}
```

**Example:**

```typescript
socket.on('replicant:change', (message) => {
  console.log('New value:', message.value);
  console.log('Revision:', message.revision);
});
```

#### `replicant:error`

Error occurred during replicant operation.

**Payload:**

```typescript
{
  type: 'error';
  namespace: string;
  name: string;
  error: string;
}
```

**Example:**

```typescript
socket.on('replicant:error', (error) => {
  console.error('Replicant error:', error.error);
});
```

### Complete WebSocket Example

```typescript
import { io } from 'socket.io-client';

// Connect
const socket = io('http://localhost:9090/dashboard');

// Subscribe to score
socket.emit('replicant:subscribe', {
  namespace: 'game',
  name: 'score',
});

// Handle initial sync
socket.on('replicant:sync', (message) => {
  console.log('Initial score:', message.value);
  updateUI(message.value);
});

// Handle updates
socket.on('replicant:change', (message) => {
  console.log('Score updated:', message.value);
  updateUI(message.value);
});

// Handle errors
socket.on('replicant:error', (error) => {
  console.error('Error:', error.error);
  showErrorToUser(error.error);
});

// Update from client
function incrementScore() {
  const newScore = currentScore + 1;
  socket.emit('replicant:update', {
    namespace: 'game',
    name: 'score',
    value: newScore,
  });
}

// Cleanup
function cleanup() {
  socket.emit('replicant:unsubscribe', {
    namespace: 'game',
    name: 'score',
  });
  socket.disconnect();
}
```

---

## Client Libraries

### React Hook (Future)

```typescript
import { useReplicant } from '@nodecg/react';

function ScoreDisplay() {
  const [score, setScore] = useReplicant<number>('game', 'score', 0);

  return (
    <div>
      <h1>Score: {score}</h1>
      <button onClick={() => setScore(score + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### Vue Composable (Future)

```typescript
import { useReplicant } from '@nodecg/vue';

export default {
  setup() {
    const score = useReplicant<number>('game', 'score', 0);

    function increment() {
      score.value++;
    }

    return { score, increment };
  },
};
```

### Vanilla JavaScript (Future)

```typescript
import { NodeCG } from '@nodecg/client';

const nodecg = new NodeCG();

// Get replicant instance
const score = nodecg.Replicant<number>('score', {
  defaultValue: 0,
});

// Listen for changes
score.on('change', (newValue, oldValue) => {
  console.log('Score:', oldValue, '->', newValue);
});

// Update value
score.value = 100;
```

---

## Schema Validation

Use Zod schemas for runtime type validation.

### Basic Schema

```typescript
import { z } from 'zod';

const ScoreSchema = z.number().int().nonnegative();

await service.register<number>('game', 'score', {
  defaultValue: 0,
  schema: ScoreSchema,
});

// Valid
await service.set('game', 'score', 100); // ✓

// Invalid - throws ValidationError
await service.set('game', 'score', -50); // ✗ negative
await service.set('game', 'score', 3.14); // ✗ not integer
```

### Complex Schema

```typescript
const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  health: z.number().min(0).max(100),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  inventory: z.array(z.string()).max(10),
  level: z.number().int().positive(),
  active: z.boolean(),
});

type Player = z.infer<typeof PlayerSchema>;

await service.register<Player>('game', 'player1', {
  defaultValue: {
    id: crypto.randomUUID(),
    name: 'Alice',
    health: 100,
    position: { x: 0, y: 0, z: 0 },
    inventory: ['sword', 'shield'],
    level: 1,
    active: true,
  },
  schema: PlayerSchema,
});
```

### Enum Schema

```typescript
const GameStateSchema = z.enum(['waiting', 'countdown', 'in-progress', 'paused', 'finished']);

type GameState = z.infer<typeof GameStateSchema>;

await service.register<GameState>('game', 'state', {
  defaultValue: 'waiting',
  schema: GameStateSchema,
});

// Valid
await service.set('game', 'state', 'in-progress'); // ✓

// Invalid
await service.set('game', 'state', 'invalid'); // ✗
```

### Optional Fields

```typescript
const SettingsSchema = z.object({
  volume: z.number().min(0).max(100),
  theme: z.enum(['light', 'dark']).optional(),
  autoplay: z.boolean().default(true),
  customCss: z.string().optional(),
});

type Settings = z.infer<typeof SettingsSchema>;
```

### Validation Bypass

```typescript
// Skip validation for trusted sources
await service.set('game', 'score', untrustedValue, 'system', false);
```

---

## Performance

### Target Metrics

- **Read Latency**: <10ms (from cache)
- **Write Latency**: <50ms (with database + broadcast)
- **Concurrent Operations**: 10,000+ ops/sec
- **WebSocket Latency**: <50ms end-to-end

### Optimization Strategies

#### 1. In-Memory Cache

All replicants cached in memory for fast reads:

```typescript
// First read - from database (~20-30ms)
const value1 = await service.get('game', 'score');

// Subsequent reads - from cache (<5ms)
const value2 = await service.get('game', 'score');
const value3 = await service.get('game', 'score');
```

#### 2. Batch Operations

```typescript
// Instead of multiple individual updates
for (let i = 0; i < 100; i++) {
  await service.set('game', `item${i}`, i); // Slow
}

// Batch into a single replicant
const items = Array.from({ length: 100 }, (_, i) => ({ id: i, value: i }));
await service.set('game', 'items', items); // Fast
```

#### 3. Selective Subscription

Only subscribe to replicants you need:

```typescript
// Good - subscribe to specific replicants
socket.emit('replicant:subscribe', { namespace: 'game', name: 'score' });

// Bad - don't subscribe to everything
```

#### 4. Debounce Rapid Updates

```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((value) => {
  service.set('game', 'score', value);
}, 100);

// Many rapid calls -> only 1 database write
for (let i = 0; i < 100; i++) {
  debouncedUpdate(i);
}
```

### Monitoring

```typescript
// Get sync manager statistics
const syncManager = getSyncManager();
const stats = syncManager.getStats();

console.log('Connected clients:', stats.connectedClients);
console.log('Total subscriptions:', stats.totalSubscriptions);
console.log('Subscriptions by replicant:', stats.subscriptionsByReplicant);
```

---

## Best Practices

### 1. Use Type Safety

```typescript
// ✓ Good - explicit types
interface GameSettings {
  volume: number;
  theme: 'light' | 'dark';
}

const settings = await service.register<GameSettings>('game', 'settings', {
  defaultValue: { volume: 50, theme: 'light' },
});

// ✗ Bad - any type
const settings = await service.register('game', 'settings', {
  defaultValue: { volume: 50, theme: 'light' },
});
```

### 2. Add Schema Validation

```typescript
// ✓ Good - runtime validation
const SettingsSchema = z.object({
  volume: z.number().min(0).max(100),
  theme: z.enum(['light', 'dark']),
});

await service.register<GameSettings>('game', 'settings', {
  defaultValue: { volume: 50, theme: 'light' },
  schema: SettingsSchema,
});
```

### 3. Use Proper Namespaces

```typescript
// ✓ Good - use bundle name as namespace
await service.register('my-overlay', 'score', { defaultValue: 0 });
await service.register('my-overlay', 'timer', { defaultValue: 0 });

// ✗ Bad - generic or missing namespace
await service.register('data', 'score', { defaultValue: 0 });
await service.register('global', 'timer', { defaultValue: 0 });
```

### 4. Clean Up Subscriptions

```typescript
// ✓ Good - unsubscribe when done
useEffect(() => {
  const unsubscribe = service.subscribe('game', 'score', handleChange);
  return () => unsubscribe(); // Cleanup
}, []);

// ✗ Bad - memory leak
useEffect(() => {
  service.subscribe('game', 'score', handleChange);
  // No cleanup!
}, []);
```

### 5. Keep Values Small

```typescript
// ✓ Good - small, focused replicants
await service.register('game', 'score', { defaultValue: 0 });
await service.register('game', 'timer', { defaultValue: '00:00' });

// ✗ Bad - large, monolithic replicant
await service.register('game', 'allData', {
  defaultValue: {
    scores: [...],
    timers: [...],
    players: [...],
    // ... 100+ fields
  }
});
```

### 6. Handle Errors

```typescript
// ✓ Good - error handling
try {
  await service.set('game', 'score', newScore);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid score:', error.message);
  } else {
    console.error('Failed to update score:', error);
  }
}

// ✗ Bad - no error handling
await service.set('game', 'score', newScore); // May throw
```

### 7. Document Your Replicants

```typescript
/**
 * Current game score
 * @namespace game
 * @name score
 * @type {number}
 * @default 0
 * @schema Positive integer
 */
await service.register<number>('game', 'score', {
  defaultValue: 0,
  schema: z.number().int().nonnegative(),
});
```

---

## Migration from NodeCG v2

### Differences

| Feature         | NodeCG v2          | NodeCG Next         |
| --------------- | ------------------ | ------------------- |
| **Database**    | NeDB (file-based)  | SQLite/PostgreSQL   |
| **Validation**  | Optional schemas   | Zod schemas         |
| **Types**       | Loose typing       | Full TypeScript     |
| **Persistence** | File per replicant | Single database     |
| **History**     | Limited            | Full versioning     |
| **API**         | Callback-based     | Promise/async-await |
| **WebSocket**   | socket.io v2       | socket.io v4        |

### Migration Guide

#### 1. Registration

**NodeCG v2:**

```javascript
const score = nodecg.Replicant('score', { defaultValue: 0 });
```

**NodeCG Next:**

```typescript
const score = await service.register<number>('my-bundle', 'score', {
  defaultValue: 0,
});
```

#### 2. Get Value

**NodeCG v2:**

```javascript
const value = score.value;
```

**NodeCG Next:**

```typescript
const value = await service.get<number>('my-bundle', 'score');
```

#### 3. Set Value

**NodeCG v2:**

```javascript
score.value = 100;
```

**NodeCG Next:**

```typescript
await service.set('my-bundle', 'score', 100);
```

#### 4. Subscribe to Changes

**NodeCG v2:**

```javascript
score.on('change', (newValue, oldValue) => {
  console.log('Changed:', oldValue, '->', newValue);
});
```

**NodeCG Next:**

```typescript
const unsubscribe = service.subscribe('my-bundle', 'score', (event) => {
  console.log('Changed:', event.oldValue, '->', event.newValue);
});

// Cleanup
unsubscribe();
```

#### 5. Schema Validation

**NodeCG v2:**

```javascript
// JSON Schema
const score = nodecg.Replicant('score', {
  defaultValue: 0,
  schemaPath: 'schemas/score.json',
});
```

**NodeCG Next:**

```typescript
// Zod Schema
import { z } from 'zod';

const score = await service.register<number>('my-bundle', 'score', {
  defaultValue: 0,
  schema: z.number().int().nonnegative(),
});
```

---

## Additional Resources

- **Examples**: `/packages/core/examples/replicant-usage.ts`
- **Tests**: `/packages/core/src/services/replicant/service.test.ts`
- **Source Code**: `/packages/core/src/services/replicant/`
- **Phase 2 Documentation**: `/docs/02_DEVELOPMENT_PHASES.md`

---

## Support

For questions, issues, or feature requests:

- **GitHub Issues**: https://github.com/nodecg/nodecg-next/issues
- **Documentation**: https://docs.nodecg.dev
- **Discord**: https://discord.gg/nodecg

---

**Last Updated**: November 2025
**API Version**: Phase 2 (v0.2.0)
**Status**: Complete - Ready for Phase 3
