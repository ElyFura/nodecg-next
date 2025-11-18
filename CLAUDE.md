# CLAUDE.md - AI Assistant Guide for nodecg-next

## ⚠️ CRITICAL: This is a Planning Repository

**This repository contains NO implementation code.** This is a comprehensive planning and design documentation repository for a proposed complete rebuild of NodeCG from the ground up. All files are design specifications, architecture documents, and planning materials written primarily in German.

**Before proceeding with any task, understand that:**
- There is no source code to modify or run
- There are no dependencies to install or build scripts to execute
- This is strategic planning documentation for a future implementation
- All "code" found here are examples and templates for the proposed system

## Project Overview

### What is NodeCG Next?

NodeCG Next is a proposed ground-up rebuild of the NodeCG broadcast graphics framework. This repository documents the complete planning, architecture, and design decisions for modernizing NodeCG with cloud-native technologies and TypeScript-first development.

### Project Scope

- **Budget**: €600,000 total investment
- **Timeline**: 12-14 months to V1.0
- **Team Size**: 3-4 full-time developers
- **Status**: GO/NO-GO decision pending
- **Risk Level**: Medium-High
- **Approach**: Complete rebuild rather than incremental migration
- **Language**: Documentation in German (Deutsch)

### Why Rebuild vs. Migration?

The project documentation recommends a complete rebuild over migration for:
- Zero technical debt in new implementation
- Modern, cloud-native architecture from day one
- 10+ year longevity vs. 3-5 years with migration
- Superior performance and scalability
- Full TypeScript implementation with strict typing

## Repository Structure

```
/home/user/nodecg-next/
├── docs/                                    # All planning documentation
│   ├── 00_EXECUTIVE_SUMMARY_REBUILD.md     # Project overview & decision summary
│   ├── 01_ARCHITECTURE_DESIGN.md           # Complete system architecture
│   ├── 02_DEVELOPMENT_PHASES.md            # 10-phase implementation plan
│   ├── 03_TECH_STACK_DECISIONS.md          # Technology choices & ADRs
│   ├── 04_CODE_EXAMPLES.md                 # Example implementations
│   ├── 05_DEPLOYMENT_INFRASTRUCTURE.md     # DevOps & deployment strategy
│   ├── 06_TEAM_ORGANIZATION.md             # Team structure & roles
│   ├── 07_RISK_MANAGEMENT.md               # Risk analysis & mitigation
│   ├── 08_TESTING_STRATEGY.md              # QA & testing approach
│   ├── 09_TIMELINE_MILESTONES.md           # Detailed project timeline
│   ├── 10_BUDGET_COST_BREAKDOWN.md         # Financial planning
│   ├── nodecg_ground_up_rebuild.md         # Comprehensive rebuild proposal
│   ├── migration_vs_rebuild_decision.md    # Decision analysis document
│   ├── README_NEUIMPLEMENTIERUNG.md        # Implementation readme (German)
│   ├── ZUSAMMENFASSUNG_NEUBAU.md           # Rebuild summary (German)
│   └── appendix/                           # Code templates & examples
│       ├── README.md                       # Appendix overview
│       ├── docker-compose.yml              # Example Docker setup
│       ├── prisma_schema.prisma            # Proposed database schema
│       ├── code_templates/                 # Example code structures
│       │   ├── bundle.config.js
│       │   ├── extension-template.js
│       │   ├── graphic-template.html
│       │   └── panel-template.html
│       └── kubernetes_manifests/           # K8s deployment examples
│           ├── config.yaml
│           ├── deployment.yaml
│           ├── pvc.yaml
│           └── service.yaml
└── .git/                                   # Git repository
```

## Proposed Tech Stack

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Web Framework** | Fastify | 5.x | High-performance HTTP server (chosen over Express) |
| **ORM** | Prisma | 6.x | Type-safe database access with PostgreSQL |
| **Database** | PostgreSQL | 16+ | Primary data store |
| **Cache** | Redis | 7.x | Session storage & caching layer |
| **Message Queue** | RabbitMQ | 3.x | Event-driven communication |
| **WebSocket** | Socket.IO | 4.x | Real-time bidirectional communication |
| **GraphQL** | Apollo Server | 4.x | Modern API layer |
| **Storage** | MinIO/S3 | - | Asset storage |
| **Language** | TypeScript | 5+ | 100% TypeScript, strict mode |

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18 | UI library with hooks & concurrent rendering |
| **Build Tool** | Vite | 6.x | Fast builds with <100ms HMR |
| **State Management** | Zustand | 5.x | Lightweight state management |
| **Data Fetching** | TanStack Query | 5.x | Server state management |
| **Routing** | TanStack Router | - | Type-safe routing |
| **UI Components** | shadcn/ui | - | Accessible component library |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS framework |
| **Forms** | React Hook Form | - | Performant form handling |
| **Validation** | Zod | 3.x | Runtime type validation |

### DevOps & Infrastructure

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Containerization** | Docker | Application packaging |
| **Orchestration** | Kubernetes | Container orchestration |
| **CI/CD** | GitHub Actions | Automated testing & deployment |
| **Monitoring** | Prometheus + Grafana | Metrics & visualization |
| **Logging** | Pino | Structured logging |
| **Tracing** | OpenTelemetry | Distributed tracing |
| **Security Scanning** | Snyk | Vulnerability detection |

### Testing Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Unit/Integration** | Vitest | Fast unit testing |
| **E2E Testing** | Playwright | Browser automation |
| **Load Testing** | k6 | Performance testing |
| **Coverage** | Vitest Coverage | >90% target |

## Proposed Architecture

### System Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  Dashboard (React) │ Graphics (Agnostic) │ Extensions (Node) │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                          │
│    GraphQL Server │ REST API │ WebSocket Gateway            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  CORE SERVICE LAYER                          │
│ Replicant Service │ Bundle Manager │ Plugin System │         │
│ Asset Manager │ User Service │ Auth Service                 │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│ PostgreSQL │ Redis Cache │ RabbitMQ │ MinIO/S3              │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Patterns

- **Monorepo**: Using pnpm workspaces + Turborepo
- **Microservices-Ready**: Designed for horizontal scaling
- **Event-Driven**: Event bus for inter-service communication
- **CQRS Pattern**: Separate read/write paths for Replicants
- **Repository Pattern**: For database access abstraction
- **Plugin Architecture**: Everything extensible via plugins
- **Clean Architecture**: Dependency inversion, clear boundaries

### Proposed Package Structure

```
packages/
├── core/                    # @nodecg/core - Main server
├── cli/                     # @nodecg/cli - Command-line tool
├── client/                  # @nodecg/client - Browser client
├── dashboard/               # @nodecg/dashboard - React dashboard
├── types/                   # @nodecg/types - Shared TypeScript types
├── plugins/                 # Official plugins
├── database-adapters/       # Database adapter plugins
└── dev-tools/               # Development tooling
```

## Development Phases

The project is planned in 10 phases over 12-14 months:

| Phase | Timeline | Focus Area |
|-------|----------|------------|
| **Phase 1** | Months 1-3 | Core Foundation (Monorepo, TypeScript setup, Fastify) |
| **Phase 2** | Months 2-4 | Replicant System V2 (CQRS, Event sourcing) |
| **Phase 3** | Months 3-5 | Bundle System (Loading, lifecycle, isolation) |
| **Phase 4** | Months 4-6 | Authentication & Authorization (OAuth2, RBAC) |
| **Phase 5** | Months 5-9 | Dashboard & UI (React, Tailwind, shadcn/ui) |
| **Phase 6** | Months 6-8 | GraphQL API (Apollo Server, schema stitching) |
| **Phase 7** | Months 7-9 | Plugin System (Dynamic loading, versioning) |
| **Phase 8** | Months 8-10 | Observability (Monitoring, logging, tracing) |
| **Phase 9** | Months 9-13 | Documentation & Advanced Testing |
| **Phase 10** | Months 10-14 | Beta Testing & V1.0 Launch |

### Key Milestones

- **Month 3**: Alpha Internal Release
- **Month 6**: Alpha Community Release
- **Month 10**: Beta Release
- **Month 12**: Release Candidate
- **Month 14**: V1.0.0 Launch

## Key Files & Their Purpose

### Planning Documents

| File | Purpose | Read When... |
|------|---------|--------------|
| `docs/00_EXECUTIVE_SUMMARY_REBUILD.md` | High-level overview, budget, timeline | Starting any work on this project |
| `docs/01_ARCHITECTURE_DESIGN.md` | Complete system architecture, diagrams, patterns | Understanding system design |
| `docs/02_DEVELOPMENT_PHASES.md` | Detailed implementation roadmap | Planning development work |
| `docs/03_TECH_STACK_DECISIONS.md` | Architecture Decision Records (ADRs) | Understanding technology choices |
| `docs/04_CODE_EXAMPLES.md` | Example implementations and patterns | Writing new code |
| `docs/08_TESTING_STRATEGY.md` | QA strategy, test coverage goals | Setting up testing |

### Code Templates & Examples

| File | Purpose | Use When... |
|------|---------|-------------|
| `docs/appendix/prisma_schema.prisma` | Complete database schema design | Setting up database |
| `docs/appendix/code_templates/extension-template.js` | Example bundle extension | Creating extensions |
| `docs/appendix/docker-compose.yml` | Docker development environment | Setting up local dev |
| `docs/appendix/kubernetes_manifests/*.yaml` | K8s deployment configuration | Deploying to production |

## Conventions & Standards

### Code Style (Proposed)

- **Language**: 100% TypeScript, zero JavaScript
- **Module System**: ESM only (no CommonJS)
- **Strict Mode**: TypeScript strict mode enabled
- **Naming**:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Database: `snake_case` for tables/columns
  - Packages: `@nodecg/<package-name>`

### Design Patterns

- **Repository Pattern**: All database access through repositories
- **Service Layer Pattern**: Business logic separated from API layer
- **Factory Pattern**: For creating complex objects
- **Observer Pattern**: Event-driven communication
- **Strategy Pattern**: Plugin system flexibility
- **Dependency Injection**: Constructor injection preferred

### API Conventions

- **REST**: RESTful principles, resource-based URLs
- **GraphQL**: Schema-first design, nullable by default
- **WebSocket**: Socket.IO events with typed payloads
- **Versioning**: `/api/v1/...` for REST, GraphQL schema evolution
- **Error Handling**: Consistent error response format

### Database Conventions

- **Migrations**: Prisma migrations, never manual SQL
- **Relationships**: Explicit foreign keys with cascading rules
- **Indexes**: Strategic indexes for common queries
- **Soft Deletes**: `deleted_at` timestamp for important data
- **Timestamps**: `created_at`, `updated_at` on all tables

## Working with This Repository

### For AI Assistants: Guidelines

#### Understanding Context

1. **Always remember**: This is planning documentation, not implementation
2. **When asked to modify code**: Clarify whether user wants to:
   - Update planning documentation
   - Modify example templates
   - Begin actual implementation (requires setup)
3. **When asked about "the codebase"**: Explain this is documentation for a planned rebuild
4. **When providing code examples**: Base them on the proposed tech stack and patterns

#### Common Tasks

**Task: "Add a new feature to NodeCG Next"**
- Response: Clarify if they want to:
  - Add to planning docs (update architecture, phases)
  - Create example code in templates
  - Begin implementing (requires project setup first)

**Task: "Fix a bug in the system"**
- Response: Explain no implementation exists yet; offer to:
  - Document the bug consideration in planning
  - Adjust architecture to prevent it
  - Add to testing strategy

**Task: "Run the tests"**
- Response: No tests exist; offer to:
  - Review testing strategy document
  - Create test plan based on `docs/08_TESTING_STRATEGY.md`
  - Design test structure for future implementation

**Task: "Update dependencies"**
- Response: No dependencies installed; offer to:
  - Update tech stack recommendations in `docs/03_TECH_STACK_DECISIONS.md`
  - Modify proposed versions in planning docs

#### Modifying Documentation

When updating planning documents:

1. **Maintain consistency**: Cross-reference related sections
2. **Update all affected files**: Changes to architecture affect phases, budget, etc.
3. **Keep German/English consistent**: Most docs are German; maintain language
4. **Version dates**: Update "Stand: [Date]" in modified documents
5. **Preserve formatting**: Maintain existing Markdown structure and style

#### Creating Example Code

When adding code templates:

1. **Use proposed tech stack**: Follow `docs/03_TECH_STACK_DECISIONS.md`
2. **Follow conventions**: Match proposed naming and patterns
3. **Add to appendix**: Place in `docs/appendix/code_templates/`
4. **Document purpose**: Add comments explaining the pattern
5. **TypeScript only**: All examples should be TypeScript

### For Implementation Phase

When this project moves to implementation:

1. **Initialize monorepo**:
   ```bash
   pnpm init
   pnpm add -Dw turbo
   # Setup workspaces in package.json
   ```

2. **Create package structure**:
   ```bash
   mkdir -p packages/{core,cli,client,dashboard,types}
   ```

3. **Setup TypeScript**:
   ```bash
   pnpm add -Dw typescript @types/node
   # Create tsconfig.json based on docs/04_CODE_EXAMPLES.md
   ```

4. **Initialize Prisma**:
   ```bash
   cd packages/core
   pnpm add @prisma/client
   pnpm add -D prisma
   # Copy schema from docs/appendix/prisma_schema.prisma
   npx prisma init
   ```

5. **Setup testing**:
   ```bash
   pnpm add -Dw vitest @vitest/ui
   # Configure based on docs/08_TESTING_STRATEGY.md
   ```

## Database Schema Overview

The proposed database schema (see `docs/appendix/prisma_schema.prisma`) includes:

### Core Entities

- **User**: Authentication, profiles, roles
- **Bundle**: Plugin packages for NodeCG
- **Replicant**: Synchronized state objects
- **Asset**: File uploads and media
- **Session**: User sessions for auth
- **Permission**: RBAC authorization
- **AuditLog**: Security and compliance tracking
- **SocketConnection**: Active WebSocket connections
- **GraphicInstance**: Running graphics tracking

### Key Relationships

- Users have many Bundles (authorship)
- Bundles have many Replicants
- Replicants have version history
- Assets belong to Bundles
- Users have Roles with Permissions
- All changes tracked in AuditLog

## Security Considerations

Based on `docs/01_ARCHITECTURE_DESIGN.md` and `docs/07_RISK_MANAGEMENT.md`:

### Authentication & Authorization

- **OAuth2** for external authentication
- **JWT** tokens for API access
- **RBAC** (Role-Based Access Control)
- **Session management** via Redis
- **Password hashing** with bcrypt/argon2

### Security Best Practices

- **Input validation**: Zod schemas on all inputs
- **SQL injection prevention**: Prisma ORM parameterized queries
- **XSS prevention**: React automatic escaping, CSP headers
- **CSRF protection**: SameSite cookies, CSRF tokens
- **Rate limiting**: Per-IP and per-user limits
- **Audit logging**: All sensitive operations logged
- **Dependency scanning**: Snyk automated scanning

## Performance Targets

Based on `docs/01_ARCHITECTURE_DESIGN.md`:

### Response Time Goals

- **API Endpoints**: <100ms p95
- **GraphQL Queries**: <200ms p95
- **WebSocket Events**: <50ms latency
- **Database Queries**: <50ms p95
- **Asset Delivery**: CDN-backed, <200ms p95

### Scalability Goals

- **Concurrent Users**: 1000+ per instance
- **Replicant Updates**: 10,000+ ops/sec
- **Horizontal Scaling**: Auto-scaling on K8s
- **Database**: Read replicas for scaling
- **Cache Hit Rate**: >80% for common queries

## Monitoring & Observability

Proposed monitoring stack (see `docs/05_DEPLOYMENT_INFRASTRUCTURE.md`):

### Metrics (Prometheus)

- Request rates, latencies, error rates
- Database connection pool stats
- Cache hit/miss ratios
- WebSocket connection counts
- Custom business metrics

### Logs (Pino + Loki)

- Structured JSON logging
- Correlation IDs for request tracing
- Log levels: error, warn, info, debug, trace
- Centralized log aggregation

### Tracing (OpenTelemetry)

- Distributed request tracing
- Database query tracing
- External API call tracking
- Performance bottleneck identification

### Alerts

- Error rate spikes
- Latency threshold breaches
- Database connection exhaustion
- Memory/CPU usage limits
- Security events

## Documentation Requirements

For future implementation, maintain:

### Code Documentation

- **JSDoc comments** on all public APIs
- **README.md** in each package
- **CHANGELOG.md** following Keep a Changelog
- **API documentation** auto-generated from code
- **Architecture Decision Records** (ADRs) for major decisions

### User Documentation

- **Getting Started Guide**
- **API Reference** (REST, GraphQL, WebSocket)
- **Bundle Development Guide**
- **Deployment Guide**
- **Migration Guide** (from NodeCG v2)

### Developer Documentation

- **Contributing Guide**
- **Development Setup**
- **Testing Guide**
- **Debugging Guide**
- **Performance Optimization**

## Testing Strategy

Based on `docs/08_TESTING_STRATEGY.md`:

### Test Coverage Goals

- **Unit Tests**: >90% coverage
- **Integration Tests**: All API endpoints, services
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load testing before releases
- **Security Tests**: Regular penetration testing

### Test Organization

```
packages/core/
├── src/
│   ├── services/
│   │   ├── replicant.service.ts
│   │   └── replicant.service.test.ts    # Co-located unit tests
│   └── ...
└── tests/
    ├── integration/                      # Integration tests
    ├── e2e/                              # End-to-end tests
    └── fixtures/                         # Test data
```

### Testing Tools

- **Vitest**: Unit & integration tests
- **Playwright**: E2E browser testing
- **Supertest**: API endpoint testing
- **k6**: Load & performance testing
- **MSW**: API mocking for tests

## Risk Management

Key risks identified in `docs/07_RISK_MANAGEMENT.md`:

### Technical Risks

- **Backward Compatibility**: Mitigation - migration tooling, adapter layer
- **Performance Regression**: Mitigation - benchmarking, load testing
- **Third-party Dependencies**: Mitigation - dependency audits, alternatives identified
- **Data Migration**: Mitigation - incremental migration, rollback procedures

### Project Risks

- **Scope Creep**: Mitigation - strict phase boundaries, feature freeze periods
- **Timeline Delays**: Mitigation - buffer time, MVP-first approach
- **Team Velocity**: Mitigation - realistic estimates, regular retrospectives
- **Budget Overruns**: Mitigation - weekly budget tracking, contingency fund

## Budget Overview

From `docs/10_BUDGET_COST_BREAKDOWN.md`:

- **Total Budget**: €600,000
- **Personnel**: ~70% (€420,000)
- **Infrastructure**: ~15% (€90,000)
- **Tools & Services**: ~10% (€60,000)
- **Contingency**: ~5% (€30,000)

## Team Organization

Proposed team structure (from `docs/06_TEAM_ORGANIZATION.md`):

- **Tech Lead**: 1 person - Architecture, technical decisions
- **Backend Developers**: 2 people - Core services, API, database
- **Frontend Developer**: 1 person - Dashboard, UI components
- **DevOps Engineer**: 0.5 person (shared) - CI/CD, infrastructure
- **QA Engineer**: 0.5 person (shared) - Testing, quality assurance

## External Resources

### NodeCG Context

- **Original NodeCG**: Broadcast graphics framework for live streaming
- **Current Version**: NodeCG v2.x (not in this repository)
- **Community**: Used by esports broadcasts, charity streams, production teams

### Reference Links

- **Original NodeCG**: https://github.com/nodecg/nodecg
- **NodeCG Docs**: https://nodecg.dev/
- **Tech Stack References**: See `docs/03_TECH_STACK_DECISIONS.md` for official docs

## Language Notes

Most documentation is in **German (Deutsch)**. Key German terms:

- **Neubau / Neuimplementierung**: Rebuild / New implementation
- **Zusammenfassung**: Summary
- **Entscheidung**: Decision
- **Architektur**: Architecture
- **Entwicklung**: Development
- **Phasen**: Phases
- **Risiko**: Risk
- **Budget**: Budget
- **Kosten**: Costs

## AI Assistant Quick Reference

### First-Time Repository Analysis

When analyzing this repo for the first time, explain to users:

1. This is a **planning repository**, not implementation code
2. Contains **comprehensive documentation** for NodeCG Next rebuild
3. Includes **example code templates** but no runnable application
4. Status: **GO/NO-GO decision pending** for €600k, 12-14 month project
5. Language: Primarily **German** documentation

### User Intent Disambiguation

When users ask to:
- **"Run the application"** → Explain no implementation exists yet
- **"Fix this bug"** → Clarify if they mean update planning docs
- **"Add a feature"** → Ask if they want planning docs or implementation
- **"Update dependencies"** → Explain these are proposed, not installed
- **"Run tests"** → Explain test strategy exists, but no tests to run

### Safe Operations

You can safely:
- ✅ Read and analyze all documentation
- ✅ Update planning documents
- ✅ Add or modify example code templates
- ✅ Create new documentation files
- ✅ Generate diagrams or summaries
- ✅ Answer questions about proposed architecture

### Operations Requiring Clarification

Ask before:
- ❓ Starting actual implementation (requires full setup)
- ❓ Installing dependencies (none currently exist)
- ❓ Creating package.json (moves from planning to implementation)
- ❓ Modifying German documents (language preservation)
- ❓ Major architectural changes (impacts budget, timeline)

## Conclusion

This repository represents a **comprehensive planning effort** for modernizing NodeCG. It demonstrates enterprise-level planning with:

- Detailed architecture and design decisions
- Clear technology choices with justifications
- Realistic budget and timeline estimates
- Risk analysis and mitigation strategies
- Complete database schema design
- Example code and deployment configurations

**For AI Assistants**: Always clarify user intent before performing actions. This is documentation, not implementation. Help users understand the planning phase and guide them toward their actual goals, whether that's refining plans or beginning implementation.

**For Future Implementers**: Follow the phases in `docs/02_DEVELOPMENT_PHASES.md`, use the database schema in `docs/appendix/prisma_schema.prisma`, and reference `docs/03_TECH_STACK_DECISIONS.md` for technology decisions. The groundwork is thoroughly documented - execution can begin when stakeholder approval is granted.

---

**Last Updated**: November 2025
**Repository Type**: Planning & Design Documentation
**Status**: Awaiting GO/NO-GO Decision
**Implementation Status**: Not Started
