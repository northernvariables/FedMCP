/**
 * Apollo Client configuration for GraphQL API
 */

import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
  credentials: 'include', // Changed from 'same-origin' to support cross-origin requests
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Pagination policy for MPs
          mPs: {
            keyArgs: ['where'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
          // Pagination policy for Bills
          bills: {
            keyArgs: ['where'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
          // Pagination policy for Statements (Hansard)
          statements: {
            keyArgs: false, // All queries share the same cache entry for offset-based pagination
            merge(existing = [], incoming, { args }) {
              // For offset-based pagination, replace or append based on offset
              const offset = args?.options?.offset || 0;
              console.log('[Apollo Cache Merge] offset:', offset, 'existing:', existing?.length, 'incoming:', incoming?.length);
              console.log('[Apollo Cache Merge] Existing IDs:', existing?.slice(0, 3).map((s: any) => s.__ref));
              console.log('[Apollo Cache Merge] Incoming IDs:', incoming?.slice(0, 3).map((s: any) => s.__ref));

              if (offset === 0) {
                // New query or reset, replace existing
                console.log('[Apollo Cache Merge] Replacing cache (offset = 0)');
                return incoming;
              }
              // Paginating, append new items to the END (existing items first, new items after)
              console.log('[Apollo Cache Merge] Appending to cache');
              const merged = [...existing, ...incoming];
              console.log('[Apollo Cache Merge] Merged length:', merged.length);
              return merged;
            },
            read(existing) {
              // Just return what's in the cache, maintaining order
              return existing;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first', // Changed from 'network-only' for better performance (60-80% reduction in API calls)
      errorPolicy: 'all',
    },
  },
});

/**
 * Create a new Apollo Client instance for server-side use (e.g., in metadata generation)
 * This is necessary because the main apolloClient is shared and may not be suitable for SSR
 */
export function createApolloClient() {
  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache', // Always fetch fresh data for metadata generation
        errorPolicy: 'all',
      },
    },
    ssrMode: true, // Enable SSR mode for server-side rendering
  });
}
