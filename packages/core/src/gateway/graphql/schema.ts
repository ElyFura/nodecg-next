/**
 * GraphQL Schema Definition
 * Comprehensive schema for NodeCG Next GraphQL API
 */

export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  # ============================================
  # Enums
  # ============================================

  enum BundleStatus {
    LOADED
    ERROR
    DISABLED
  }

  enum ReplicantStatus {
    ACTIVE
    IDLE
  }

  enum UserRole {
    ADMIN
    OPERATOR
    VIEWER
  }

  # ============================================
  # Bundle Types
  # ============================================

  type Bundle {
    name: String!
    version: String!
    description: String
    authors: [Author!]!
    homepage: String
    license: String
    git: GitRepository
    status: BundleStatus!
    hasExtension: Boolean!
    hasDashboard: Boolean!
    hasGraphics: Boolean!
    dashboardPanels: [DashboardPanel!]!
    graphics: [Graphic!]!
    replicants: [Replicant!]!
  }

  type Author {
    name: String!
    email: String
    url: String
  }

  type GitRepository {
    type: String
    url: String
  }

  type DashboardPanel {
    name: String!
    title: String!
    width: Int!
    file: String!
    headerColor: String
  }

  type Graphic {
    name: String!
    title: String!
    file: String!
    width: Int!
    height: Int!
  }

  # ============================================
  # Replicant Types
  # ============================================

  type Replicant {
    namespace: String!
    name: String!
    value: JSON!
    revision: Int!
    status: ReplicantStatus!
    schema: JSON
    defaultValue: JSON
    createdAt: DateTime
    updatedAt: DateTime
  }

  input ReplicantInput {
    namespace: String!
    name: String!
    value: JSON!
  }

  input ReplicantUpdateInput {
    value: JSON!
  }

  # ============================================
  # User Types
  # ============================================

  type User {
    id: ID!
    username: String!
    email: String!
    role: Role
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLogin: DateTime
  }

  type Role {
    id: ID!
    name: String!
    description: String
    permissions: [Permission!]!
  }

  type Permission {
    id: ID!
    resource: String!
    action: String!
    description: String
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    roleId: String
  }

  input UpdateUserInput {
    username: String
    email: String
    roleId: String
  }

  # ============================================
  # Statistics & System Types
  # ============================================

  type SystemStats {
    bundles: Int!
    replicants: Int!
    users: Int!
    status: SystemStatus!
    uptime: Float!
    memory: MemoryStats!
    version: String!
  }

  enum SystemStatus {
    ONLINE
    OFFLINE
    ERROR
    MAINTENANCE
  }

  type MemoryStats {
    rss: Float!
    heapTotal: Float!
    heapUsed: Float!
    external: Float!
  }

  # ============================================
  # Subscription Types
  # ============================================

  type ReplicantUpdatePayload {
    namespace: String!
    name: String!
    value: JSON!
    revision: Int!
  }

  type BundleUpdatePayload {
    type: BundleUpdateType!
    bundle: Bundle!
  }

  enum BundleUpdateType {
    LOADED
    UNLOADED
    RELOADED
    ERROR
  }

  type SystemEvent {
    type: SystemEventType!
    message: String!
    timestamp: DateTime!
    data: JSON
  }

  enum SystemEventType {
    SERVER_START
    SERVER_STOP
    ERROR
    WARNING
    INFO
  }

  # ============================================
  # Query Root
  # ============================================

  type Query {
    # Bundle Queries
    bundles: [Bundle!]!
    bundle(name: String!): Bundle
    bundleCount: Int!

    # Replicant Queries
    replicants(namespace: String): [Replicant!]!
    replicant(namespace: String!, name: String!): Replicant
    replicantCount(namespace: String): Int!
    replicantNamespaces: [String!]!

    # User Queries
    users: [User!]!
    user(id: ID!): User
    me: User
    userCount: Int!

    # System Queries
    systemStats: SystemStats!
    health: String!
  }

  # ============================================
  # Mutation Root
  # ============================================

  type Mutation {
    # Bundle Mutations
    reloadBundles: Boolean!
    reloadBundle(name: String!): Boolean!

    # Replicant Mutations
    createReplicant(input: ReplicantInput!): Replicant!
    updateReplicant(namespace: String!, name: String!, input: ReplicantUpdateInput!): Replicant!
    deleteReplicant(namespace: String!, name: String!): Boolean!

    # User Mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
  }

  # ============================================
  # Subscription Root
  # ============================================

  type Subscription {
    # Replicant Subscriptions
    replicantUpdated(namespace: String, name: String): ReplicantUpdatePayload!
    replicantCreated: ReplicantUpdatePayload!
    replicantDeleted: ReplicantUpdatePayload!

    # Bundle Subscriptions
    bundleUpdated: BundleUpdatePayload!

    # System Subscriptions
    systemEvent(types: [SystemEventType!]): SystemEvent!
  }
`;
