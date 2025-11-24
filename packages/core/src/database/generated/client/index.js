/**
 * Prisma Client Stub
 * This is a minimal stub for offline environments
 * Run `pnpm prisma generate` in online environment to generate full client
 */

/* eslint-disable */

// Export enum
const UserRole = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

// Model mock with common operations
const createModelMock = () => ({
  findUnique: async () => null,
  findMany: async () => [],
  findFirst: async () => null,
  create: async (data) => ({ id: 'mock-id', ...data.data }),
  update: async (data) => ({ id: data.where.id, ...data.data }),
  updateMany: async () => ({ count: 0 }),
  delete: async () => ({}),
  deleteMany: async () => ({ count: 0 }),
  count: async () => 0,
  aggregate: async () => ({ _sum: {}, _avg: {}, _min: {}, _max: {} }),
  upsert: async (data) => ({ id: 'mock-id', ...data.create }),
});

// Mock Prisma Client
class PrismaClient {
  constructor(options) {
    this.replicant = createModelMock();
    this.replicantHistory = createModelMock();
    this.user = createModelMock();
    this.session = createModelMock();
    this.oAuthProvider = createModelMock();
    this.asset = createModelMock();
    this.bundle = createModelMock();
    this.auditLog = createModelMock();
  }

  async $connect() {
    return Promise.resolve();
  }

  async $disconnect() {
    return Promise.resolve();
  }

  async $transaction(fn) {
    return fn(this);
  }

  async $queryRaw(query, ...values) {
    return [];
  }

  $on(event, callback) {}
}

module.exports = {
  PrismaClient,
  Prisma: PrismaClient,
  UserRole,
};

exports.PrismaClient = PrismaClient;
exports.Prisma = PrismaClient;
exports.UserRole = UserRole;
