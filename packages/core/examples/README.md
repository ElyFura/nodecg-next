# NodeCG Next - Examples

This directory contains comprehensive examples demonstrating how to use various NodeCG Next features.

## Running Examples

### Prerequisites

1. Ensure database is set up:

```bash
cd packages/core
pnpm db:setup
```

2. Build the project:

```bash
cd ../..
pnpm build
```

### Run Replicant Examples

```bash
cd packages/core
tsx examples/replicant-usage.ts
```

## Available Examples

### replicant-usage.ts

Comprehensive examples of the Replicant system including:

- **Example 1**: Basic replicant registration and usage
- **Example 2**: Type-safe replicants with Zod schema validation
- **Example 3**: Subscribing to replicant changes
- **Example 4**: Accessing replicant history and revisions
- **Example 5**: Querying replicants by namespace
- **Example 6**: Complex nested objects with validation
- **Example 7**: Deleting replicants
- **Example 8**: WebSocket client integration (conceptual)
- **Example 9**: REST API usage (conceptual)

## What are Replicants?

Replicants are NodeCG's synchronized state management system. They provide:

- **Type Safety**: Full TypeScript support with optional Zod schema validation
- **Persistence**: Automatically saved to SQLite/PostgreSQL database
- **Synchronization**: Real-time updates via WebSocket to all connected clients
- **History Tracking**: Complete revision history with timestamps and authors
- **Observable**: Subscribe to changes with callbacks
- **RESTful API**: HTTP endpoints for CRUD operations

## Architecture

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
│  • SyncManager - Real-time broadcasting                     │
│  • ReplicantService - Business logic & validation           │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  • In-Memory Cache (fast reads)                             │
│  • Prisma ORM (database access)                             │
│  • SQLite/PostgreSQL (persistence)                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Namespaces

Replicants are organized by namespace (typically your bundle name):

```typescript
await service.register('my-bundle', 'scoreboard', { defaultValue: 0 });
await service.register('my-bundle', 'timer', { defaultValue: '00:00' });
```

### Validation

Use Zod schemas for runtime type validation:

```typescript
const PlayerSchema = z.object({
  name: z.string(),
  score: z.number().nonnegative(),
});

await service.register<Player>('game', 'player1', {
  defaultValue: { name: 'Alice', score: 0 },
  schema: PlayerSchema,
});
```

### Persistence

Replicants are persistent by default. To create non-persistent (memory-only) replicants:

```typescript
await service.register('temp', 'sessionData', {
  defaultValue: {},
  persistent: false,
});
```

### Subscriptions

Subscribe to changes for reactive updates:

```typescript
const unsubscribe = service.subscribe('game', 'score', (event) => {
  console.log('Score changed:', event.oldValue, '->', event.newValue);
});

// Later, clean up
unsubscribe();
```

## WebSocket Events

Clients can interact with replicants via WebSocket:

### Subscribe to a Replicant

```typescript
socket.emit('replicant:subscribe', {
  namespace: 'my-bundle',
  name: 'scoreboard',
});
```

### Receive Initial Value

```typescript
socket.on('replicant:sync', (message) => {
  console.log('Initial value:', message.value);
  console.log('Checksum:', message.checksum);
});
```

### Receive Updates

```typescript
socket.on('replicant:change', (message) => {
  console.log('New value:', message.value);
  console.log('Revision:', message.revision);
});
```

### Update from Client

```typescript
socket.emit('replicant:update', {
  namespace: 'my-bundle',
  name: 'scoreboard',
  value: { home: 10, away: 8 },
});
```

### Error Handling

```typescript
socket.on('replicant:error', (error) => {
  console.error('Replicant error:', error.error);
});
```

## REST API Endpoints

All endpoints require authentication via Bearer token:

| Method | Endpoint                                   | Description                  | Auth Required |
| ------ | ------------------------------------------ | ---------------------------- | ------------- |
| GET    | `/api/replicants`                          | List all replicants          | Admin         |
| GET    | `/api/replicants/:namespace`               | List replicants in namespace | Yes           |
| GET    | `/api/replicants/:namespace/:name`         | Get replicant value          | Yes           |
| PUT    | `/api/replicants/:namespace/:name`         | Update replicant             | Operator      |
| DELETE | `/api/replicants/:namespace/:name`         | Delete replicant             | Operator      |
| GET    | `/api/replicants/:namespace/:name/history` | Get revision history         | Yes           |

### Example API Calls

```bash
# Get all replicants for a namespace
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9090/api/replicants/game-overlay

# Update a replicant
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": {"score": 100}}' \
  http://localhost:9090/api/replicants/game-overlay/scoreboard

# Get history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:9090/api/replicants/game-overlay/scoreboard/history?limit=10"
```

## Performance

The Replicant system is designed for high performance:

- **In-Memory Cache**: All replicants cached in memory for <10ms reads
- **Delta Updates**: Only changes are broadcast (future enhancement)
- **Checksums**: MD5 validation to detect inconsistencies
- **Connection Pooling**: Efficient database connections via Prisma
- **Event-Driven**: Minimal overhead for idle replicants

## Best Practices

1. **Use Type Safety**: Always define TypeScript types and Zod schemas
2. **Namespace Properly**: Use your bundle name as the namespace
3. **Keep Values Small**: Large objects slow serialization/deserialization
4. **Unsubscribe**: Always clean up subscriptions to prevent memory leaks
5. **Error Handling**: Wrap service calls in try-catch blocks
6. **Validation**: Let Zod schemas validate at runtime, not just compile-time

## Troubleshooting

### "Replicant service not available" (503)

The ReplicantService is initialized during WebSocket setup. Ensure the server has fully started before making API calls.

### Validation Errors

Check your Zod schema definitions. Use `.parse()` to debug:

```typescript
try {
  PlayerSchema.parse(myData);
} catch (error) {
  console.error(error.issues); // Detailed validation errors
}
```

### Replicant Not Found

Ensure the replicant is registered before accessing it:

```typescript
const value = await service.get('my-bundle', 'myReplicant');
if (value === null) {
  console.log('Replicant not registered');
}
```

## Next Steps

- Check `packages/core/src/services/replicant/` for service implementation
- See `packages/core/src/gateway/http/routes/api/replicants.ts` for REST API
- Review `packages/core/src/services/replicant/sync-manager.ts` for WebSocket sync
- Read `docs/02_DEVELOPMENT_PHASES.md` for Phase 2 details
