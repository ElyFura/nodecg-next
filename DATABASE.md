# Database Setup - NodeCG Next

## Overview

NodeCG Next uses **Prisma** as the ORM with support for multiple databases:

- **SQLite** (default for development) - Zero-config, file-based database like original NodeCG
- **PostgreSQL** (recommended for production) - Robust, scalable relational database

## Quick Start (Development)

The project is configured to use SQLite by default for easy local development:

```bash
# 1. Install dependencies (if not already done)
pnpm install

# 2. Set up the database (generates Prisma client and creates SQLite database)
cd packages/core
pnpm run db:setup

# 3. Start the development server
cd ../..
pnpm run dev
```

This will create a `nodecg.db` file in the project root automatically.

## Database Configuration

### Using SQLite (Default - Development)

The `.env` file is already configured for SQLite:

```env
DATABASE_URL=file:./nodecg.db
```

The Prisma schema (`packages/core/prisma/schema.prisma`) uses SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### Using PostgreSQL (Production)

For production deployments:

1. **Update `.env`:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nodecg?schema=public
```

2. **Update Prisma schema** (`packages/core/prisma/schema.prisma`):

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

3. **Regenerate Prisma client:**

```bash
cd packages/core
pnpm run db:setup
```

## Available Database Commands

All commands should be run from `packages/core/` directory:

```bash
# Generate Prisma client and push schema to database (no migrations)
pnpm run db:setup

# Push schema changes to database (faster, no migration files)
pnpm run db:push

# Generate Prisma client only
pnpm run prisma:generate

# Create a migration (for production use)
pnpm run prisma:migrate

# Reset database (WARNING: deletes all data)
pnpm run db:reset

# Open Prisma Studio (database GUI)
pnpm run prisma:studio
```

## Database Schema

The database includes tables for:

- **Replicants** - Synchronized state objects with history
- **Users** - User accounts with OAuth support
- **Sessions** - JWT token management
- **Assets** - File uploads and media
- **Bundles** - Plugin packages
- **Audit Logs** - Security and compliance tracking

See `packages/core/prisma/schema.prisma` for the full schema definition.

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

Make sure you have a `.env` file in the project root. You can copy from `.env.example`:

```bash
cp .env.example .env
```

### Prisma client not generated

If you get import errors about `@prisma/client`, generate the client:

```bash
cd packages/core
pnpm run prisma:generate
```

### Database file not found (SQLite)

The SQLite database file is created automatically when you run `db:setup` or when the server starts. Make sure you're running commands from the correct directory.

### Network errors during Prisma setup

If you're in an offline environment, Prisma may fail to download binaries. In this case:

1. Ensure you have network connectivity
2. Or use the environment variable: `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`

## Migration Strategy

### Development (SQLite)

For local development, we use `prisma db push` which doesn't create migration files:

```bash
pnpm run db:push
```

### Production (PostgreSQL)

For production, use proper migrations:

```bash
# Create a new migration
pnpm run prisma:migrate

# Apply migrations in production
pnpm exec prisma migrate deploy
```

## Original NodeCG Comparison

**Original NodeCG** used NeDB (file-based document store):

- Simple `.db` files
- No SQL required
- Limited query capabilities

**NodeCG Next** uses Prisma + SQLite for development:

- Still simple `.db` file (SQLite)
- SQL-based with powerful queries
- Type-safe ORM
- Easy migration to PostgreSQL for production
- Maintains the "zero-config" philosophy of original NodeCG

## Docker Support

The included `docker-compose.yml` provides PostgreSQL for testing production setup locally:

```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres

# Update .env to use PostgreSQL
DATABASE_URL=postgresql://nodecg:nodecg@localhost:5432/nodecg

# Setup database
cd packages/core
pnpm run db:setup
```

## Data Persistence

- **SQLite**: Data stored in `nodecg.db` file (gitignored)
- **PostgreSQL**: Data stored in database server
- **Backup**: Copy the `.db` file for SQLite, use `pg_dump` for PostgreSQL

## Best Practices

1. **Development**: Use SQLite for fast iteration
2. **Testing**: Use SQLite for unit tests (fast, isolated)
3. **Staging**: Use PostgreSQL to match production
4. **Production**: Use PostgreSQL with proper backups
5. **Version Control**: Never commit `.db` files or `.env` files
6. **Migrations**: Always test migrations on staging before production

## Learn More

- [Prisma Documentation](https://www.prisma.io/docs/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
