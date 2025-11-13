/**
 * GraphQL server setup with GraphQL Yoga and @neo4j/graphql
 */

import { createYoga } from 'graphql-yoga';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { createServer } from 'http';
import neo4j from 'neo4j-driver';
import { typeDefs } from './schema.js';
import { getDriver } from './neo4j.js';
import { config } from './config.js';
import { fetchMPNews } from './utils/newsFetcher.js';
import { queryCache, createCacheKey } from './utils/cache.js';
import { validateLimit, DEFAULT_LIMITS } from './utils/validation.js';
import { initializeAPIKeys, authenticateRequest, type AuthContext } from './utils/auth.js';
import { checkRateLimit, formatResetTime } from './utils/rateLimiter.js';

export interface ServerContext {
  req: Request;
  auth: AuthContext;
}

// Cache for OpenParliament API calls (1 hour TTL)
const openParliamentCache = new Map<string, { data: any; expires: number }>();

/**
 * Fetch scheduled committee meetings from OpenParliament API
 */
async function fetchScheduledMeetings(startDate: string, endDate: string): Promise<any[]> {
  const cacheKey = `meetings-${startDate}-${endDate}`;
  const cached = openParliamentCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const url = `https://api.openparliament.ca/committees/meetings/?date__gte=${startDate}&date__lte=${endDate}&limit=1000`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CanadaGPT/1.0 (contact@canadagpt.ca)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`OpenParliament API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const meetings = data.objects || [];

    // Filter for scheduled meetings only (no evidence yet)
    const scheduledMeetings = meetings.filter((m: any) => !m.has_evidence);

    // Cache for 1 hour
    openParliamentCache.set(cacheKey, {
      data: scheduledMeetings,
      expires: Date.now() + 60 * 60 * 1000,
    });

    return scheduledMeetings;
  } catch (error) {
    console.error('Error fetching scheduled meetings:', error);
    return [];
  }
}

/**
 * Fetch committee metadata for display names
 */
async function fetchCommitteeNames(): Promise<Map<string, string>> {
  const cacheKey = 'committee-names';
  const cached = openParliamentCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const url = 'https://api.openparliament.ca/committees/?limit=1000';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CanadaGPT/1.0 (contact@canadagpt.ca)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`OpenParliament API error: ${response.status}`);
      return new Map();
    }

    const data = await response.json();
    const committees = data.objects || [];

    const nameMap = new Map<string, string>();
    committees.forEach((c: any) => {
      // Extract short code from URL like "/committees/finance/" -> "finance"
      const match = c.url.match(/\/committees\/([^\/]+)\//);
      if (match) {
        nameMap.set(match[1], c.short_name.en || c.name.en);
      }
    });

    // Cache for 1 hour
    openParliamentCache.set(cacheKey, {
      data: nameMap,
      expires: Date.now() + 60 * 60 * 1000,
    });

    return nameMap;
  } catch (error) {
    console.error('Error fetching committee names:', error);
    return new Map();
  }
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
          const { mpName } = args;
          const limit = validateLimit(args.limit, DEFAULT_LIMITS.top);

          // Create cache key with validated limit
          const cacheKey = createCacheKey('mpNews', { mpName, limit });
          const cached = queryCache.get(cacheKey);

          if (cached) {
            return cached;
          }

          const news = await fetchMPNews(mpName, limit);

          // Cache for 5 minutes (300 seconds)
          queryCache.set(cacheKey, news, 300);

          return news;
        },

        // Cached randomMPs query (5 minute TTL)
        randomMPs: async (_parent: unknown, args: { limit?: number; parties?: string[] }, context: any) => {
          // Validate limit to prevent DoS attacks (max 1000)
          const validatedLimit = validateLimit(args.limit, DEFAULT_LIMITS.random);

          // Create cache key with validated limit to prevent cache pollution
          const cacheKey = createCacheKey('randomMPs', { limit: validatedLimit, parties: args.parties });
          const cached = queryCache.get(cacheKey);

          if (cached) {
            return cached;
          }

          // Execute the Cypher query directly
          const session = driver.session();
          try {
            // Convert to Neo4j integer type to ensure proper type handling
            const limit = neo4j.int(validatedLimit);

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
              { limit, parties: args.parties || null }
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
          // Validate limit to prevent DoS attacks (max 1000)
          const validatedLimit = validateLimit(args.limit, DEFAULT_LIMITS.top);

          // Create cache key with validated limit to prevent cache pollution
          const cacheKey = createCacheKey('topSpenders', { fiscalYear: args.fiscalYear, limit: validatedLimit });
          const cached = queryCache.get(cacheKey);

          if (cached) {
            return cached;
          }

          // Execute the Cypher query directly
          const session = driver.session();
          try {
            // Convert to Neo4j integer type to ensure proper type handling
            const limit = neo4j.int(validatedLimit);
            const fiscalYear = args.fiscalYear ? neo4j.int(Math.floor(args.fiscalYear)) : null;

            const result = await session.run(
              `
              MATCH (mp:MP)-[:INCURRED]->(e:Expense)
              WHERE $fiscalYear IS NULL OR e.fiscal_year = $fiscalYear
              WITH mp, sum(e.amount) AS total_expenses
              RETURN {
                mp: mp,
                total_expenses: total_expenses
              } AS summary
              ORDER BY total_expenses DESC
              LIMIT $limit
              `,
              { fiscalYear, limit }
            );

            const summaries = result.records.map(record => record.get('summary'));

            // Cache for 1 hour (3600 seconds)
            queryCache.set(cacheKey, summaries, 3600);

            return summaries;
          } finally {
            await session.close();
          }
        },

        // Custom resolver for calendar data with scheduled meetings
        debatesCalendarData: async (_parent: unknown, args: { startDate: string; endDate: string }, context: any) => {
          const { startDate, endDate } = args;

          // 1. Fetch historical debate data from Neo4j
          const session = driver.session();
          try {
            const result = await session.run(
              `
              MATCH (d:Document)
              WHERE d.public = true
                AND d.date >= $startDate
                AND d.date <= $endDate
              OPTIONAL MATCH (d)<-[:PART_OF]-(s:Statement)
              WITH d,
                   ANY(stmt IN collect(s.h1_en) WHERE stmt CONTAINS 'Oral Question' OR stmt CONTAINS 'Question Period') AS has_qp_statements
              WITH d.date AS debate_date,
                   collect({
                     doc_type: d.document_type,
                     has_qp: has_qp_statements
                   }) AS docs
              WITH debate_date,
                   ANY(doc IN docs WHERE doc.doc_type = 'D' AND NOT doc.has_qp) AS hasHouseDebates,
                   ANY(doc IN docs WHERE doc.doc_type = 'D' AND doc.has_qp) AS hasQuestionPeriod,
                   ANY(doc IN docs WHERE doc.doc_type = 'E') AS hasCommittee
              WHERE hasHouseDebates OR hasQuestionPeriod OR hasCommittee
              RETURN debate_date AS date,
                     hasHouseDebates,
                     hasQuestionPeriod,
                     hasCommittee
              ORDER BY debate_date ASC
              `,
              { startDate, endDate }
            );

            // Convert Neo4j results to map
            const neo4jDataMap = new Map<string, any>();
            result.records.forEach(record => {
              const date = record.get('date');
              neo4jDataMap.set(date, {
                date,
                hasHouseDebates: record.get('hasHouseDebates'),
                hasQuestionPeriod: record.get('hasQuestionPeriod'),
                hasCommittee: record.get('hasCommittee'),
              });
            });

            // 2. Fetch scheduled meetings from OpenParliament API
            const scheduledMeetings = await fetchScheduledMeetings(startDate, endDate);
            const committeeNames = await fetchCommitteeNames();

            // 3. Group scheduled meetings by date
            const meetingsByDate = new Map<string, any[]>();
            scheduledMeetings.forEach((meeting: any) => {
              const date = meeting.date;
              if (!meetingsByDate.has(date)) {
                meetingsByDate.set(date, []);
              }

              // Extract committee code from URL
              const match = meeting.committee_url.match(/\/committees\/([^\/]+)\//);
              const committeeCode = match ? match[1] : 'unknown';
              const committeeName = committeeNames.get(committeeCode) || committeeCode;

              meetingsByDate.get(date)!.push({
                committee_code: committeeCode,
                committee_name: committeeName,
                number: meeting.number,
                in_camera: meeting.in_camera,
              });
            });

            // 4. Merge Neo4j data with scheduled meetings
            const allDates = new Set([...neo4jDataMap.keys(), ...meetingsByDate.keys()]);
            const mergedData = Array.from(allDates).map(date => {
              const neo4jData = neo4jDataMap.get(date) || {
                date,
                hasHouseDebates: false,
                hasQuestionPeriod: false,
                hasCommittee: false,
              };

              const scheduled = meetingsByDate.get(date) || [];

              return {
                date,
                hasHouseDebates: neo4jData.hasHouseDebates,
                hasQuestionPeriod: neo4jData.hasQuestionPeriod,
                hasCommittee: neo4jData.hasCommittee,
                hasScheduledMeeting: scheduled.length > 0,
                scheduledMeetings: scheduled,
              };
            });

            // Sort by date
            mergedData.sort((a, b) => a.date.localeCompare(b.date));

            return mergedData;
          } catch (error) {
            console.error('Error in debatesCalendarData resolver:', error);
            // Return empty array on error
            return [];
          } finally {
            await session.close();
          }
        },
      },
    },
    features: {
      authorization: {
        key: config.auth.jwtSecret,
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

  // Initialize API keys from environment variables
  initializeAPIKeys();

  const neoSchema = createGraphQLSchema();
  const schema = await neoSchema.getSchema();

  const yoga = createYoga<ServerContext>({
    schema,
    context: async ({ request }) => {
      // Authenticate request
      const auth = await authenticateRequest(request);

      // Enforce authentication if required
      if (config.auth.required && !auth.authenticated) {
        throw new Error(
          'Authentication required. Provide a valid API key via X-API-Key header or Authorization: Bearer header.'
        );
      }

      // Check rate limit
      const rateLimit = checkRateLimit(auth);
      if (!rateLimit.allowed) {
        throw new Error(
          `Rate limit exceeded. Try again in ${formatResetTime(rateLimit.resetTime)}. ` +
          `Limit: ${rateLimit.limit} requests/hour`
        );
      }

      return { req: request, auth };
    },
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
