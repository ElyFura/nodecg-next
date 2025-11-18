# Database Repositories

This directory contains all database repositories for NodeCG Next. These repositories implement the **Repository Pattern** and provide a clean abstraction layer over Prisma ORM for SQL database access.

## 🎯 Overview

All repositories work **completely offline** with local PostgreSQL. No internet connection required after initial setup.

## 📦 Available Repositories

- **ReplicantRepository** - Manages synchronized state (Replicants) and their history
- **UserRepository** - Manages users, sessions, and OAuth providers
- **BundleRepository** - Manages NodeCG bundles (plugins/packages)
- **AssetRepository** - Manages uploaded files and media assets

## 🚀 Quick Start

### Basic Usage

```typescript
import { getPrismaClient, getRepositories } from '../database/client';
import { createLogger } from '../utils/logger';

// Get repository container (singleton)
const logger = createLogger();
const repos = getRepositories(logger);

// Use repositories
const replicant = await repos.replicant.findByNamespaceAndName('my-bundle', 'scoreboard');
const users = await repos.user.findMany();
const bundles = await repos.bundle.findEnabled();
const assets = await repos.asset.findByNamespace('my-bundle');
```

### Direct Repository Usage

```typescript
import { PrismaClient } from '../generated/client';
import { ReplicantRepository } from './replicant.repository';

const prisma = new PrismaClient();
const replicantRepo = new ReplicantRepository(prisma);

// CRUD operations
const replicant = await replicantRepo.create({
  namespace: 'my-bundle',
  name: 'counter',
  value: JSON.stringify({ count: 0 }),
});

await replicantRepo.updateByNamespaceAndName(
  'my-bundle',
  'counter',
  JSON.stringify({ count: 5 }),
  'admin-user'
);
```

## 📚 Repository Documentation

### ReplicantRepository

Manages Replicants (synchronized state objects) with full history tracking.

**Key Methods:**

```typescript
// Find replicant
findByNamespaceAndName(namespace: string, name: string): Promise<Replicant | null>
findByNamespace(namespace: string): Promise<Replicant[]>

// Create replicant
create(data: ReplicantCreateInput): Promise<Replicant>

// Update with automatic history tracking
update(id: string, data: ReplicantUpdateInput): Promise<Replicant>
updateByNamespaceAndName(namespace: string, name: string, value: string, changedBy?: string): Promise<Replicant>

// History
getHistory(id: string, limit?: number): Promise<ReplicantHistoryEntry[]>
pruneHistory(keepCount?: number): Promise<number>

// Discovery
getNamespaces(): Promise<string[]>
getReplicantNames(namespace: string): Promise<string[]>
```

**Example:**

```typescript
// Create replicant
const scoreboard = await repos.replicant.create({
  namespace: 'my-bundle',
  name: 'scoreboard',
  value: JSON.stringify({ team1: 0, team2: 0 }),
  schema: JSON.stringify({ type: 'object', properties: { team1: { type: 'number' } } }),
});

// Update replicant (creates history entry automatically)
await repos.replicant.updateByNamespaceAndName(
  'my-bundle',
  'scoreboard',
  JSON.stringify({ team1: 5, team2: 3 }),
  'operator-123'
);

// Get history
const history = await repos.replicant.getHistory(scoreboard.id, 10);
console.log(`Replicant has ${history.length} history entries`);

// Cleanup old history (keep last 100 entries per replicant)
const deleted = await repos.replicant.pruneHistory(100);
console.log(`Pruned ${deleted} old history entries`);
```

---

### UserRepository

Manages users, authentication sessions, and OAuth providers.

**Key Methods:**

```typescript
// Find users
findByUsername(username: string): Promise<User | null>
findByEmail(email: string): Promise<User | null>
findAdmins(): Promise<User[]>

// Create/update users
create(data: UserCreateInput): Promise<User>
update(id: string, data: UserUpdateInput): Promise<User>
changeRole(userId: string, role: UserRole): Promise<User>

// Session management
createSession(data: SessionCreateInput): Promise<Session>
findActiveSessionByToken(token: string): Promise<Session | null>
deleteUserSessions(userId: string): Promise<number>
deleteExpiredSessions(): Promise<number>

// OAuth providers
upsertOAuthProvider(data: OAuthProviderCreateInput): Promise<OAuthProvider>
findByOAuthProvider(provider: string, providerId: string): Promise<User | null>

// Statistics
getStatistics(): Promise<UserStatistics>
```

**Example:**

```typescript
// Create user
const user = await repos.user.create({
  username: 'admin',
  email: 'admin@example.com',
  password: 'hashed_password_here', // Already hashed with bcrypt
  role: 'ADMIN',
});

// Create session (login)
const session = await repos.user.createSession({
  userId: user.id,
  token: 'jwt_token_here',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Verify session
const activeSession = await repos.user.findActiveSessionByToken('jwt_token_here');
if (activeSession) {
  console.log(`User ${activeSession.user.username} is authenticated`);
}

// Link OAuth provider
await repos.user.upsertOAuthProvider({
  userId: user.id,
  provider: 'twitch',
  providerId: 'twitch_user_id',
  accessToken: 'twitch_access_token',
  refreshToken: 'twitch_refresh_token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
});

// Logout all devices
await repos.user.deleteUserSessions(user.id);
```

---

### BundleRepository

Manages NodeCG bundles (plugin packages).

**Key Methods:**

```typescript
// Find bundles
findByName(name: string): Promise<Bundle | null>
findEnabled(): Promise<Bundle[]>
findDisabled(): Promise<Bundle[]>

// Create/update bundles
create(data: BundleCreateInput): Promise<Bundle>
upsert(data: BundleCreateInput): Promise<Bundle> // Create or update

// Enable/disable
enable(id: string): Promise<Bundle>
disable(id: string): Promise<Bundle>
bulkUpdateEnabled(names: string[], enabled: boolean): Promise<number>

// Configuration
getConfig(id: string): Promise<BundleConfig | null>
updateConfig(id: string, config: BundleConfig): Promise<Bundle>

// Statistics
getStatistics(): Promise<BundleStatistics>
getAllNames(): Promise<string[]>
```

**Example:**

```typescript
// Register bundle (upsert = create or update)
const bundle = await repos.bundle.upsert({
  name: 'my-scoreboard-bundle',
  version: '1.0.0',
  config: JSON.stringify({
    name: 'my-scoreboard-bundle',
    version: '1.0.0',
    description: 'A scoreboard overlay',
    nodecg: {
      compatibleRange: '^2.0.0',
      dashboardPanels: [
        {
          name: 'control',
          title: 'Scoreboard Control',
          width: 2,
          file: 'panel.html',
        },
      ],
      graphics: [
        {
          file: 'scoreboard.html',
          width: 1920,
          height: 1080,
        },
      ],
    },
  }),
  enabled: true,
});

// Disable bundle
await repos.bundle.disableByName('my-scoreboard-bundle');

// Get bundle config
const config = await repos.bundle.getConfigByName('my-scoreboard-bundle');
console.log(`Bundle has ${config?.nodecg?.graphics?.length || 0} graphics`);

// Enable multiple bundles at once
await repos.bundle.bulkUpdateEnabled(['bundle-a', 'bundle-b', 'bundle-c'], true);
```

---

### AssetRepository

Manages uploaded files and media assets.

**Key Methods:**

```typescript
// Find assets
findByNamespaceCategoryAndName(namespace: string, category: string, name: string): Promise<Asset | null>
findByNamespace(namespace: string): Promise<Asset[]>
findByNamespaceAndCategory(namespace: string, category: string): Promise<Asset[]>
findImages(): Promise<Asset[]>
findVideos(): Promise<Asset[]>
findAudio(): Promise<Asset[]>

// Create/update assets
create(data: AssetCreateInput): Promise<Asset>
upsert(data: AssetCreateInput): Promise<Asset> // Replace existing
findByChecksum(sum: string): Promise<Asset[]> // Duplicate detection

// Search
searchByName(query: string): Promise<Asset[]>
findRecent(limit?: number): Promise<Asset[]>
findLargeAssets(minSizeBytes: number, limit?: number): Promise<Asset[]>

// Statistics
getStatistics(): Promise<AssetStatistics>
getTotalSize(): Promise<number>
getTotalSizeByNamespace(namespace: string): Promise<number>

// Cleanup
bulkDelete(ids: string[]): Promise<number>
deleteByNamespace(namespace: string): Promise<number>
```

**Example:**

```typescript
// Upload asset
const asset = await repos.asset.create({
  namespace: 'my-bundle',
  category: 'images',
  name: 'logo.png',
  sum: 'md5_checksum_here',
  url: 'https://cdn.example.com/assets/logo.png',
  size: 102400, // 100 KB
  mimeType: 'image/png',
});

// Check for duplicates by checksum
const duplicates = await repos.asset.findByChecksum('md5_checksum_here');
if (duplicates.length > 1) {
  console.log(`Found ${duplicates.length} duplicate files`);
}

// Get all images
const images = await repos.asset.findImages();
console.log(`Total images: ${images.length}`);

// Get storage statistics
const stats = await repos.asset.getStatistics();
console.log(`Total storage used: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total assets: ${stats.totalAssets}`);

// Search by name
const results = await repos.asset.searchByName('logo');
console.log(`Found ${results.length} assets matching "logo"`);

// Delete all assets for a bundle
const deleted = await repos.asset.deleteByNamespace('old-bundle');
console.log(`Deleted ${deleted} assets`);
```

---

## 🧪 Testing

All repositories have comprehensive test coverage. Run tests with:

```bash
# Run all tests
pnpm test

# Run repository tests only
pnpm test repositories

# Run specific repository tests
pnpm test replicant.repository.test.ts

# Run tests with coverage
pnpm test --coverage
```

### Test Database Setup

Tests use a test database. Configure in `.env.test`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nodecg_test"
```

Before running tests:

```bash
# Run migrations on test database
pnpm prisma migrate dev --name init

# Or use Docker test database
docker-compose -f docker-compose.test.yml up -d
```

---

## 🏗️ Repository Pattern Benefits

### ✅ Advantages

1. **SQL-Only** - Works completely offline with local PostgreSQL
2. **Testable** - Easy to mock repositories in tests
3. **Type-Safe** - Full TypeScript type safety with Prisma
4. **Maintainable** - Business logic separated from database queries
5. **Flexible** - Easy to switch database implementations
6. **Performant** - Optimized queries with indexes

### 📋 Pattern Structure

```
Repository Layer (This)
    ↓
Prisma ORM
    ↓
PostgreSQL Database (Local)
```

---

## 🔧 Advanced Usage

### Transactions

Use Prisma transactions for atomic operations:

```typescript
import { getPrismaClient } from '../database/client';

const prisma = getPrismaClient();

await prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: { username: 'newuser', role: 'VIEWER' },
  });

  // Create session
  await tx.session.create({
    data: {
      userId: user.id,
      token: 'session_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Both operations succeed or both fail
});
```

### Batch Operations

```typescript
// Batch create replicants
const replicants = await Promise.all([
  repos.replicant.create({ namespace: 'bundle', name: 'rep1', value: '{}' }),
  repos.replicant.create({ namespace: 'bundle', name: 'rep2', value: '{}' }),
  repos.replicant.create({ namespace: 'bundle', name: 'rep3', value: '{}' }),
]);

// Batch delete assets
const ids = ['id1', 'id2', 'id3'];
const deleted = await repos.asset.bulkDelete(ids);
```

### Custom Queries

Access Prisma client directly for custom queries:

```typescript
import { getPrismaClient } from '../database/client';

const prisma = getPrismaClient();

// Custom raw SQL query (PostgreSQL)
const result = await prisma.$queryRaw`
  SELECT namespace, COUNT(*) as count
  FROM "Replicant"
  GROUP BY namespace
  ORDER BY count DESC
`;
```

---

## 📊 Performance Tips

1. **Use indexes** - The schema has indexes on common query fields
2. **Limit results** - Use `take` and `skip` for pagination
3. **Include selectively** - Only include relations when needed
4. **Connection pooling** - Configured in Prisma client
5. **Prune history** - Run `pruneHistory()` periodically

---

## 🔒 Security Considerations

1. **Never store plain text passwords** - Always hash with bcrypt before storing
2. **Sanitize inputs** - Prisma handles SQL injection, but validate data
3. **Delete expired sessions** - Run `deleteExpiredSessions()` periodically
4. **Audit logs** - Use history and AuditLog for tracking changes
5. **Access control** - Check user roles before allowing operations

---

## 📝 Best Practices

1. **Use repository methods** - Don't bypass repositories to use Prisma directly
2. **Handle errors** - Repositories throw errors, catch them appropriately
3. **Log operations** - Use the logger for important operations
4. **Validate data** - Use Zod schemas before passing to repositories
5. **Clean up** - Delete unused data periodically

---

## 🆘 Troubleshooting

### "Prisma Client not generated"

```bash
pnpm prisma generate
```

### "Database connection failed"

Check PostgreSQL is running:

```bash
docker-compose up -d postgres
```

### "Migration failed"

Reset database (WARNING: deletes all data):

```bash
pnpm prisma migrate reset
```

---

## 📚 References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated:** 2025-11-18
**Status:** Production Ready
