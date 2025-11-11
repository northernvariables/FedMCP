/**
 * GraphQL server setup with GraphQL Yoga and @neo4j/graphql
 */

import { createYoga } from 'graphql-yoga';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { createServer } from 'http';
import { typeDefs } from './schema.js';
import { getDriver } from './neo4j.js';
import { config } from './config.js';
import { fetchMPNews } from './utils/newsFetcher.js';
import { queryCache, createCacheKey } from './utils/cache.js';

export interface ServerContext {
  req: Request;
}

/**
 * Create GraphQL schema with Neo4j integration
 */
export function createGraphQLSchema() {
  const driver = getDriver();

  const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver,
    resolvers: {
      Query: {
        mpNews: async (_parent: unknown, args: { mpName: string; limit?: number }) => {
          const { mpName, limit = 10 } = args;
          return await fetchMPNews(mpName, limit);
        },

        // Cached randomMPs query (5 minute TTL)
        randomMPs: async (_parent: unknown, args: { limit?: number; parties?: string[] }, context: any) => {
          const cacheKey = createCacheKey('randomMPs', args);
          const cached = queryCache.get(cacheKey);

          if (cached) {
            return cached;
          }

          // Execute the Cypher query directly
          const session = driver.session();
          try {
            const result = await session.run(
              `
              MATCH (mp:MP)
              WHERE mp.current = true
                AND ($parties IS NULL OR size($parties) = 0 OR mp.party IN $parties)
              WITH mp, rand() AS r
              ORDER BY r
              LIMIT $limit
              RETURN mp
              `,
              { limit: args.limit || 12, parties: args.parties || null }
            );

            const mps = result.records.map(record => record.get('mp').properties);

            // Cache for 5 minutes (300 seconds)
            queryCache.set(cacheKey, mps, 300);

            return mps;
          } finally {
            await session.close();
          }
        },

        // Cached topSpenders query (1 hour TTL)
        topSpenders: async (_parent: unknown, args: { fiscalYear?: number; limit?: number }, context: any) => {
          const cacheKey = createCacheKey('topSpenders', args);
          const cached = queryCache.get(cacheKey);

          if (cached) {
            return cached;
          }

          // Execute the Cypher query directly
          const session = driver.session();
          try {
            const result = await session.run(
              `
              MATCH (mp:MP)-[:INCURRED]->(e:Expense)
              WHERE $fiscalYear IS NULL OR e.fiscal_year = $fiscalYear
              WITH mp, sum(e.amount) AS total_expenses
              RETURN {
                mp: {
                  id: mp.id,
                  name: mp.name,
                  given_name: mp.given_name,
                  family_name: mp.family_name,
                  party: mp.party,
                  riding: mp.riding,
                  current: mp.current,
                  email: mp.email,
                  phone: mp.phone,
                  updated_at: mp.updated_at
                },
                total_expenses: total_expenses
              } AS summary
              ORDER BY total_expenses DESC
              LIMIT $limit
              `,
              { fiscalYear: args.fiscalYear || null, limit: args.limit || 10 }
            );

            const summaries = result.records.map(record => record.get('summary'));

            // Cache for 1 hour (3600 seconds)
            queryCache.set(cacheKey, summaries, 3600);

            return summaries;
          } finally {
            await session.close();
          }
        },
      },
    },
    features: {
      authorization: {
        key: 'not-used-yet', // TODO: Add JWT auth in production
      },
    },
  });

  return neoSchema;
}

/**
 * Create GraphQL Yoga server
 */
export async function createGraphQLServer() {
  console.log('🚀 Creating GraphQL server...');
  console.log(`📋 CORS Origins (type: ${typeof config.cors.origins}, value:`, config.cors.origins);

  const neoSchema = createGraphQLSchema();
  const schema = await neoSchema.getSchema();

  const yoga = createYoga<ServerContext>({
    schema,
    graphqlEndpoint: '/graphql',
    landingPage: config.graphql.playground,
    graphiql: config.graphql.playground
      ? {
          title: 'CanadaGPT GraphQL API',
          defaultQuery: `# Welcome to CanadaGPT GraphQL API
#
# Example queries:

# 1. List MPs with pagination
query ListMPs {
  mPs(options: { limit: 10, sort: [{ name: ASC }] }) {
    id
    name
    party
    riding
    current
  }
}

# 2. Get MP with relationships
query GetMP {
  mPs(where: { name: "Pierre Poilievre" }) {
    id
    name
    party
    riding
    memberOf {
      name
      code
    }
    represents {
      name
      province
    }
    sponsored {
      number
      title
      status
    }
  }
}

# 3. MP Performance Scorecard
query MPScorecard {
  mpScorecard(mpId: "pierre-poilievre") {
    mp {
      name
      party
    }
    bills_sponsored
    bills_passed
    votes_participated
    legislative_effectiveness
    lobbyist_meetings
  }
}

# 4. Top Spenders
query TopSpenders {
  topSpenders(fiscalYear: 2025, limit: 10) {
    mp {
      name
      party
    }
    total_expenses
  }
}

# 5. Bill Lobbying Activity
query BillLobbying {
  billLobbying(billNumber: "C-11", session: "44-1") {
    bill {
      title
      status
    }
    organizations_lobbying
    organizations {
      name
      industry
      lobbying_count
    }
  }
}`,
        }
      : false,
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    maskedErrors: config.nodeEnv === 'production',
  });

  console.log('✅ GraphQL server created');
  return yoga;
}

/**
 * Start HTTP server
 */
export async function startServer() {
  const yoga = await createGraphQLServer();

  const server = createServer(yoga);

  return new Promise<typeof server>((resolve, reject) => {
    server.listen(config.server.port, config.server.host, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 CanadaGPT GraphQL API');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📡 Server running at http://${config.server.host}:${config.server.port}/graphql`);
      console.log(`🎮 GraphiQL: http://localhost:${config.server.port}/graphql`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      resolve(server);
    });

    server.on('error', (error) => {
      console.error('❌ Server failed to start:', error);
      reject(error);
    });
  });
}
