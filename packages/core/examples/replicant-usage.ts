/**
 * Replicant Usage Examples
 *
 * This file demonstrates how to use the NodeCG Next Replicant system
 * for synchronized state management across server, dashboard, graphics, and extensions.
 *
 * Replicants are:
 * - Type-safe with TypeScript and Zod schema validation
 * - Automatically synchronized via WebSocket
 * - Persistently stored in SQLite/PostgreSQL
 * - Observable with subscription callbacks
 * - Version-tracked with full history
 */

import { z } from 'zod';
import { ReplicantService } from '../src/services/replicant';
import { getPrismaClient } from '../src/database/client';
import { getEventBus } from '../src/utils/event-bus';
import { createLogger } from '../src/utils/logger';

// =============================================================================
// Example 1: Basic Replicant Registration and Usage
// =============================================================================

async function example1_BasicUsage(service: ReplicantService) {
  console.log('\n=== Example 1: Basic Replicant Usage ===\n');

  // Register a simple replicant with a default value
  const currentScore = await service.register<number>('game-overlay', 'currentScore', {
    defaultValue: 0,
    persistent: true,
  });

  console.log('Initial score:', currentScore); // 0

  // Update the value
  await service.set('game-overlay', 'currentScore', 100);

  // Get the current value
  const updatedScore = await service.get<number>('game-overlay', 'currentScore');
  console.log('Updated score:', updatedScore); // 100
}

// =============================================================================
// Example 2: Type-Safe Replicants with Zod Schema Validation
// =============================================================================

async function example2_TypeSafeWithValidation(service: ReplicantService) {
  console.log('\n=== Example 2: Type-Safe Replicants with Validation ===\n');

  // Define a Zod schema for a player object
  const PlayerSchema = z.object({
    name: z.string().min(1).max(50),
    health: z.number().min(0).max(100),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    inventory: z.array(z.string()).max(10),
    isAlive: z.boolean(),
  });

  type Player = z.infer<typeof PlayerSchema>;

  // Register with schema validation
  const player = await service.register<Player>('game-overlay', 'player1', {
    defaultValue: {
      name: 'Alice',
      health: 100,
      position: { x: 0, y: 0 },
      inventory: ['sword', 'shield'],
      isAlive: true,
    },
    schema: PlayerSchema,
    persistent: true,
  });

  console.log('Registered player:', player);

  // Valid update - will succeed
  await service.set('game-overlay', 'player1', {
    name: 'Alice',
    health: 75,
    position: { x: 10, y: 20 },
    inventory: ['sword', 'shield', 'potion'],
    isAlive: true,
  });

  console.log('Player updated successfully');

  // Invalid update - will throw ValidationError
  try {
    await service.set('game-overlay', 'player1', {
      name: '', // Too short (min 1)
      health: 150, // Too high (max 100)
      position: { x: 10, y: 20 },
      inventory: [],
      isAlive: true,
    });
  } catch (error) {
    console.error('Validation failed as expected:', error instanceof Error ? error.message : error);
  }
}

// =============================================================================
// Example 3: Subscribing to Replicant Changes
// =============================================================================

async function example3_Subscriptions(service: ReplicantService) {
  console.log('\n=== Example 3: Subscribing to Changes ===\n');

  // Register a counter replicant
  await service.register<number>('dashboard', 'counter', {
    defaultValue: 0,
    persistent: true,
  });

  // Subscribe to changes
  const unsubscribe = service.subscribe('dashboard', 'counter', (event) => {
    console.log('Counter changed!');
    console.log('  Old value:', event.oldValue);
    console.log('  New value:', event.newValue);
    console.log('  Revision:', event.revision);
    console.log('  Changed by:', event.changedBy || 'system');
    console.log('  Timestamp:', new Date(event.timestamp).toISOString());
  });

  // Make some changes
  await service.set('dashboard', 'counter', 1, 'user-123');
  await service.set('dashboard', 'counter', 2, 'user-123');
  await service.set('dashboard', 'counter', 3, 'user-456');

  // Unsubscribe when done
  unsubscribe();
  console.log('Unsubscribed from counter changes');
}

// =============================================================================
// Example 4: Accessing Replicant History
// =============================================================================

async function example4_History(service: ReplicantService) {
  console.log('\n=== Example 4: Accessing History ===\n');

  // Register and update a replicant multiple times
  await service.register<string>('chat', 'lastMessage', {
    defaultValue: 'Welcome!',
    persistent: true,
  });

  await service.set('chat', 'lastMessage', 'Hello everyone!', 'user-1');
  await service.set('chat', 'lastMessage', 'How are you?', 'user-2');
  await service.set('chat', 'lastMessage', 'Good luck!', 'user-3');

  // Get history
  const history = await service.getHistory('chat', 'lastMessage', 10);

  console.log('Message history (most recent first):');
  history.forEach((entry) => {
    console.log(
      `  Rev ${entry.revision}: "${entry.value}" by ${entry.changedBy} at ${entry.changedAt.toISOString()}`
    );
  });
}

// =============================================================================
// Example 5: Managing Multiple Replicants in a Namespace
// =============================================================================

async function example5_NamespaceQueries(service: ReplicantService) {
  console.log('\n=== Example 5: Namespace Queries ===\n');

  // Register multiple replicants in the same namespace
  await service.register<number>('tournament', 'round', { defaultValue: 1 });
  await service.register<string>('tournament', 'status', { defaultValue: 'waiting' });
  await service.register<string[]>('tournament', 'teams', { defaultValue: [] });
  await service.register<boolean>('tournament', 'paused', { defaultValue: false });

  // Query all replicants in a namespace
  const tournamentReplicants = await service.getByNamespace('tournament');

  console.log('Tournament replicants:');
  tournamentReplicants.forEach((rep) => {
    console.log(`  - ${rep.name} (rev ${rep.revision}, schema: ${rep.hasSchema})`);
  });

  // Get all replicants (admin operation)
  const allReplicants = await service.getAll();
  console.log(`\nTotal replicants across all namespaces: ${allReplicants.length}`);
}

// =============================================================================
// Example 6: Complex Object with Nested Validation
// =============================================================================

async function example6_ComplexObject(service: ReplicantService) {
  console.log('\n=== Example 6: Complex Object with Nested Validation ===\n');

  // Define a complex schema for a tournament bracket
  const TournamentSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(3).max(100),
    startDate: z.string().datetime(),
    status: z.enum(['upcoming', 'in-progress', 'completed', 'cancelled']),
    teams: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          score: z.number().int().nonnegative(),
          eliminated: z.boolean(),
        })
      )
      .min(2)
      .max(32),
    currentRound: z.number().int().positive(),
    settings: z.object({
      bestOf: z.number().int().positive().max(9),
      timeout: z.number().int().positive(),
      allowTies: z.boolean(),
    }),
  });

  type Tournament = z.infer<typeof TournamentSchema>;

  const tournament = await service.register<Tournament>('esports', 'activeTournament', {
    defaultValue: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Summer Championship 2025',
      startDate: new Date().toISOString(),
      status: 'upcoming',
      teams: [
        { id: 'team-1', name: 'Red Dragons', score: 0, eliminated: false },
        { id: 'team-2', name: 'Blue Sharks', score: 0, eliminated: false },
      ],
      currentRound: 1,
      settings: {
        bestOf: 5,
        timeout: 300,
        allowTies: false,
      },
    },
    schema: TournamentSchema,
  });

  console.log('Tournament registered:', tournament.name);

  // Update tournament status
  const updatedTournament = { ...tournament, status: 'in-progress' as const };
  await service.set('esports', 'activeTournament', updatedTournament);

  console.log('Tournament started!');
}

// =============================================================================
// Example 7: Deleting Replicants
// =============================================================================

async function example7_Deletion(service: ReplicantService) {
  console.log('\n=== Example 7: Deleting Replicants ===\n');

  // Register a temporary replicant
  await service.register<string>('temp', 'tempData', {
    defaultValue: 'temporary',
    persistent: true,
  });

  console.log('Created temporary replicant');

  // Delete the replicant
  await service.delete('temp', 'tempData');

  console.log('Deleted temporary replicant');

  // Attempting to get deleted replicant returns null
  const deletedValue = await service.get('temp', 'tempData');
  console.log('Deleted replicant value:', deletedValue); // null
}

// =============================================================================
// Example 8: WebSocket Client Integration (Conceptual)
// =============================================================================

/**
 * Client-side usage (in browser or extension)
 *
 * This shows how a client would subscribe to replicant updates via WebSocket
 *
 * ```typescript
 * import { io } from 'socket.io-client';
 *
 * // Connect to dashboard namespace
 * const socket = io('/dashboard');
 *
 * // Subscribe to a replicant
 * socket.emit('replicant:subscribe', {
 *   namespace: 'game-overlay',
 *   name: 'currentScore'
 * });
 *
 * // Listen for initial sync
 * socket.on('replicant:sync', (message) => {
 *   console.log('Initial value:', message.value);
 *   console.log('Checksum:', message.checksum);
 * });
 *
 * // Listen for updates
 * socket.on('replicant:change', (message) => {
 *   console.log('Score changed to:', message.value);
 *   console.log('Revision:', message.revision);
 * });
 *
 * // Update from client
 * socket.emit('replicant:update', {
 *   namespace: 'game-overlay',
 *   name: 'currentScore',
 *   value: 200
 * });
 *
 * // Unsubscribe
 * socket.emit('replicant:unsubscribe', {
 *   namespace: 'game-overlay',
 *   name: 'currentScore'
 * });
 * ```
 */

// =============================================================================
// Example 9: REST API Usage (Conceptual)
// =============================================================================

/**
 * REST API endpoints for replicants
 *
 * ```bash
 * # Get all replicants (admin only)
 * curl -H "Authorization: Bearer <token>" http://localhost:9090/api/replicants
 *
 * # Get replicants for a namespace
 * curl -H "Authorization: Bearer <token>" http://localhost:9090/api/replicants/game-overlay
 *
 * # Get specific replicant
 * curl -H "Authorization: Bearer <token>" http://localhost:9090/api/replicants/game-overlay/currentScore
 *
 * # Update replicant
 * curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
 *   -d '{"value": 300}' \
 *   http://localhost:9090/api/replicants/game-overlay/currentScore
 *
 * # Get history
 * curl -H "Authorization: Bearer <token>" \
 *   http://localhost:9090/api/replicants/game-overlay/currentScore/history?limit=20
 *
 * # Delete replicant (admin only)
 * curl -X DELETE -H "Authorization: Bearer <token>" \
 *   http://localhost:9090/api/replicants/game-overlay/currentScore
 * ```
 */

// =============================================================================
// Main: Run All Examples
// =============================================================================

async function main() {
  console.log('=================================================');
  console.log('NodeCG Next - Replicant System Examples');
  console.log('=================================================');

  // Initialize service
  const logger = createLogger({ level: 'info' });
  const prisma = getPrismaClient(logger);
  const eventBus = getEventBus();

  const service = new ReplicantService(prisma, undefined, logger, eventBus);
  await service.initialize();

  try {
    // Run examples
    await example1_BasicUsage(service);
    await example2_TypeSafeWithValidation(service);
    await example3_Subscriptions(service);
    await example4_History(service);
    await example5_NamespaceQueries(service);
    await example6_ComplexObject(service);
    await example7_Deletion(service);

    console.log('\n=================================================');
    console.log('All examples completed successfully!');
    console.log('=================================================\n');
  } finally {
    // Cleanup
    await service.shutdown();
  }
}

// Run examples if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}
