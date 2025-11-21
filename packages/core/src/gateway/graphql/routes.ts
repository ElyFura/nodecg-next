/**
 * GraphQL Routes Registration
 * Registers GraphQL endpoint and sets up subscriptions
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyApollo, {
  fastifyApolloDrainPlugin,
  type ApolloFastifyContextFunction,
} from '@as-integrations/fastify';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
// import { WebSocketServer } from 'ws';
// import { makeServer } from 'graphql-ws';
import { typeDefs } from './schema';
import { resolvers, type GraphQLContext } from './resolvers';

/**
 * GraphQL routes plugin
 */
export const graphqlRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    schema,
    introspection: true, // Enable in development
    plugins: [
      // Properly handle server shutdown
      fastifyApolloDrainPlugin(fastify),
    ],
  });

  await apollo.start();

  // Context function - extracts authentication from request
  const contextFunction: ApolloFastifyContextFunction<GraphQLContext> = async (request, _reply) => {
    // Extract user from request (set by auth middleware if present)
    const user = (request as any).user;

    return {
      fastify,
      user,
    };
  };

  // Register GraphQL route
  await fastify.register(fastifyApollo(apollo), {
    context: contextFunction,
  });

  // TODO: Setup WebSocket server for subscriptions
  // This requires additional configuration with graphql-ws
  // For now, subscriptions are defined in the schema but not yet operational

  fastify.log.info('GraphQL API enabled at /graphql');
  fastify.log.info('GraphQL Playground available at http://localhost:3000/graphql');
};
