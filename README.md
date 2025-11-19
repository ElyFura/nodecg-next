# NodeCG Next

> Modern, TypeScript-first broadcast graphics framework for professional streaming productions

[![CI](https://github.com/ElyFura/nodecg-next/actions/workflows/ci.yml/badge.svg)](https://github.com/ElyFura/nodecg-next/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Project Status

**Current Phase:** Phase 2 - Replicant System V2 (In Progress)
**Completed Phases:** Phase 1 ✅ Core Foundation | Phase 3 ✅ Bundle System

NodeCG Next is a complete ground-up rewrite of NodeCG, designed for modern web standards and professional broadcast workflows. Phases 1 and 3 are complete with full implementation, tests, and documentation.

## ✨ Features

- 🎯 **100% TypeScript** - Complete type safety across the entire stack
- ⚡ **Lightning Fast** - Fastify server with <3s startup time
- 🔄 **Real-time Sync** - Socket.IO with <10ms replicant updates
- 🎨 **Modern UI** - React 18 dashboard with shadcn/ui components
- 🐳 **Cloud Native** - Docker and Kubernetes ready out of the box
- 🔒 **Enterprise Security** - OAuth2, RBAC, and audit logging
- 📊 **GraphQL API** - Flexible queries and real-time subscriptions
- 🔌 **Plugin System** - Extend functionality without touching core
- 📈 **Observable** - OpenTelemetry, Prometheus, and Grafana integration

## 📋 Architecture

NodeCG Next is built as a monorepo using modern tooling:

- **Build System:** Turborepo + pnpm workspaces
- **Backend:** Fastify 5 + Prisma + Socket.IO
- **Database:** PostgreSQL (production) / SQLite (development)
- **Cache:** Redis 7
- **Message Queue:** RabbitMQ
- **Frontend:** React 18 + Vite + TanStack
- **Testing:** Vitest + Playwright

### Package Structure

```
packages/
├── core/          # Core server implementation
├── types/         # Shared TypeScript types
├── client/        # Client library for graphics/dashboard
├── cli/           # CLI tools for bundle development
└── dashboard/     # React dashboard UI
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose (optional but recommended)

### Quick Start

1. **Clone the repository:**

```bash
git clone https://github.com/ElyFura/nodecg-next.git
cd nodecg-next
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker (recommended):**

```bash
docker-compose up -d
```

Or **start development services manually:**

```bash
# Terminal 1: Start PostgreSQL, Redis, RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Terminal 2: Run Prisma migrations
cd packages/core
pnpm prisma:generate
pnpm prisma migrate dev

# Terminal 3: Start development server
pnpm dev
```

5. **Access the application:**

- NodeCG Server: http://localhost:3000
- Health Check: http://localhost:3000/health
- RabbitMQ Management: http://localhost:15672 (nodecg/nodecg)
- MinIO Console: http://localhost:9001 (nodecg/nodecg123)

## 📦 Available Scripts

```bash
# Development
pnpm dev              # Start all packages in watch mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting
pnpm typecheck        # Run TypeScript type checking

# Database
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:studio    # Open Prisma Studio

# Cleanup
pnpm clean            # Remove all build artifacts
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @nodecg/core test
```

## 📚 Documentation

Full documentation is available in the `/docs` directory:

- [Architecture Design](docs/01_ARCHITECTURE_DESIGN.md)
- [Development Phases](docs/02_DEVELOPMENT_PHASES.md)
- [Tech Stack Decisions](docs/03_TECH_STACK_DECISIONS.md)
- [Code Examples](docs/04_CODE_EXAMPLES.md)

## 🗓️ Roadmap

### Phase 1: Core Foundation ✅ (Completed)

- ✅ Monorepo setup with Turborepo
- ✅ TypeScript configuration
- ✅ Fastify server with health checks
- ✅ Prisma ORM with PostgreSQL schema
- ✅ Socket.IO WebSocket server
- ✅ Docker development environment
- ✅ Event Bus implementation
- ✅ Configuration loader
- ✅ Error handling system
- ✅ Validation middleware
- ✅ Base service architecture

### Phase 2: Replicant System V2 (In Progress - Months 2-4)

- ⏳ Type-safe Replicant API
- ⏳ Client-server synchronization
- ⏳ Schema validation with Zod
- ⏳ React/Vue/Svelte hooks

### Phase 3: Bundle System ✅ (Completed)

- ✅ Bundle Manager Service with lifecycle management
- ✅ Bundle discovery and dependency resolution
- ✅ Hot Module Replacement
- ✅ CLI tool (create, dev, build commands)
- ✅ Bundle templates (React, Vue, Minimal TS/JS)
- ✅ Asset Upload Handler with S3/MinIO integration
- ✅ Image processing with Sharp
- ✅ Comprehensive test suite (>80% coverage)

### Phase 4-10: See [Development Phases](docs/02_DEVELOPMENT_PHASES.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built upon the foundation of [NodeCG](https://github.com/nodecg/nodecg)
- Inspired by modern web frameworks and best practices
- Community feedback and contributions

## 📞 Support

- 📧 Email: support@nodecg.dev
- 💬 Discord: [NodeCG Community](https://discord.gg/nodecg)
- 🐛 Issues: [GitHub Issues](https://github.com/ElyFura/nodecg-next/issues)

---

**Built with ❤️ for the broadcast graphics community**
