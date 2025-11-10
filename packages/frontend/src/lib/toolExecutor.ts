/**
 * Tool Executor - Execute Claude tool calls via GraphQL
 *
 * Maps Claude tool calls to GraphQL queries against Neo4j database
 */

import { apolloClient } from './apollo-client';
import {
  SEARCH_MPS,
  GET_MP,
  GET_MP_SCORECARD,
  GET_MP_SPEECHES,
  SEARCH_BILLS,
  GET_BILL,
  GET_BILL_LOBBYING,
  GET_BILL_DEBATES,
  SEARCH_HANSARD,
  GET_COMMITTEES,
  GET_COMMITTEE,
  GET_COMMITTEE_TESTIMONY,
  GET_TOP_SPENDERS,
  GET_CONFLICTS_OF_INTEREST,
  SEARCH_LOBBY_REGISTRATIONS,
  GET_RECENT_DEBATES,
} from './queries';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute a tool call by name with given parameters
 */
export async function executeToolCall(
  toolName: string,
  input: Record<string, any>
): Promise<ToolResult> {
  try {
    console.log(`[ToolExecutor] Executing tool: ${toolName}`, input);

    switch (toolName) {
      // ============================================
      // MP Tools
      // ============================================
      case 'search_mps': {
        const { data } = await apolloClient.query({
          query: SEARCH_MPS,
          variables: {
            searchTerm: input.searchTerm,
            party: input.party,
            current: input.current ?? true,
            cabinetOnly: input.cabinetOnly ?? false,
            limit: input.limit ?? 10,
          },
        });
        return { success: true, data: data.searchMPs };
      }

      case 'get_mp': {
        const { data } = await apolloClient.query({
          query: GET_MP,
          variables: { id: input.mpId },
        });
        return { success: true, data: data.mps[0] };
      }

      case 'get_mp_scorecard': {
        const { data } = await apolloClient.query({
          query: GET_MP_SCORECARD,
          variables: { mpId: input.mpId },
        });
        return { success: true, data: data.mpScorecard };
      }

      case 'get_mp_speeches': {
        const { data } = await apolloClient.query({
          query: GET_MP_SPEECHES,
          variables: {
            mpId: input.mpId,
            limit: input.limit ?? 20,
          },
        });
        return { success: true, data: data.mps[0]?.statements };
      }

      // ============================================
      // Bill Tools
      // ============================================
      case 'search_bills': {
        const { data } = await apolloClient.query({
          query: SEARCH_BILLS,
          variables: {
            searchTerm: input.searchTerm,
            session: input.session,
            status: input.status,
            billType: input.billType,
            limit: input.limit ?? 20,
          },
        });
        return { success: true, data: data.searchBills };
      }

      case 'get_bill': {
        const { data } = await apolloClient.query({
          query: GET_BILL,
          variables: {
            number: input.billNumber,
            session: input.session,
          },
        });
        return { success: true, data: data.bills[0] };
      }

      case 'get_bill_lobbying': {
        const { data } = await apolloClient.query({
          query: GET_BILL_LOBBYING,
          variables: {
            billNumber: input.billNumber,
            session: input.session,
          },
        });
        return { success: true, data: data.billLobbying };
      }

      case 'get_bill_debates': {
        const { data } = await apolloClient.query({
          query: GET_BILL_DEBATES,
          variables: {
            billNumber: input.billNumber,
            session: input.session,
            limit: input.limit ?? 50,
          },
        });
        return { success: true, data: data.bills[0]?.mentioned_in };
      }

      // ============================================
      // Hansard/Debate Tools
      // ============================================
      case 'search_hansard': {
        const { data } = await apolloClient.query({
          query: SEARCH_HANSARD,
          variables: {
            query: input.searchTerm,
            limit: input.limit ?? 50,
            language: input.language ?? 'en',
          },
        });

        // Post-process to filter by MP, dates, document type, procedural flag, committee
        let results = data.searchHansard;

        if (input.mpId && results) {
          results = results.filter((s: any) => s.madeBy?.id === input.mpId);
        }

        if (input.documentType && results) {
          results = results.filter((s: any) => s.partOf?.document_type === input.documentType);
        }

        if (input.excludeProcedural && results) {
          results = results.filter((s: any) => s.procedural !== true);
        }

        if (input.committeeCode && results) {
          // For committee filtering, we need to check if the document is Evidence (type E)
          // and if it's presented to the specified committee
          results = results.filter((s: any) => {
            // Only filter Evidence documents by committee
            if (s.partOf?.document_type !== 'E') return false;
            return s.partOf?.presentedTo?.code === input.committeeCode;
          });
        }

        if (input.startDate && results) {
          results = results.filter((s: any) => s.partOf?.date >= input.startDate);
        }

        if (input.endDate && results) {
          results = results.filter((s: any) => s.partOf?.date <= input.endDate);
        }

        // If there are results, automatically include navigation suggestion
        if (results && results.length > 0) {
          // Build URL with same parameters
          const params = new URLSearchParams();
          if (input.searchTerm) params.set('q', input.searchTerm);
          if (input.mpId) params.set('mp', input.mpId);
          if (input.documentType) params.set('docType', input.documentType);
          if (input.excludeProcedural) params.set('excludeProcedural', 'true');
          if (input.startDate) params.set('startDate', input.startDate);
          if (input.endDate) params.set('endDate', input.endDate);

          const url = `/hansard?${params.toString()}`;

          return {
            success: true,
            data: {
              results: results,
              _navigation: {
                url,
                message: `Found ${results.length} speeches. View them on a dedicated page with advanced filtering.`,
              },
            },
          };
        }

        return { success: true, data: results };
      }

      case 'get_recent_debates': {
        const { data } = await apolloClient.query({
          query: GET_RECENT_DEBATES,
          variables: {
            limit: input.limit ?? 20,
          },
        });
        return { success: true, data: data.recentDebates };
      }

      // ============================================
      // Committee Tools
      // ============================================
      case 'get_committees': {
        const { data } = await apolloClient.query({
          query: GET_COMMITTEES,
          variables: {
            current: input.current ?? true,
          },
        });
        return { success: true, data: data.committees };
      }

      case 'get_committee': {
        const { data } = await apolloClient.query({
          query: GET_COMMITTEE,
          variables: { code: input.committeeCode },
        });
        return { success: true, data: data.committees[0] };
      }

      case 'get_committee_testimony': {
        const { data } = await apolloClient.query({
          query: GET_COMMITTEE_TESTIMONY,
          variables: {
            committeeCode: input.committeeCode,
            startDate: input.startDate,
            endDate: input.endDate,
            limit: input.limit ?? 50,
          },
        });
        return { success: true, data: data.committees[0]?.testimony };
      }

      // ============================================
      // Accountability/Lobbying Tools
      // ============================================
      case 'get_top_spenders': {
        const { data } = await apolloClient.query({
          query: GET_TOP_SPENDERS,
          variables: {
            fiscalYear: input.fiscalYear,
            quarter: input.quarter,
            limit: input.limit ?? 10,
          },
        });
        return { success: true, data: data.topSpenders };
      }

      case 'detect_conflicts_of_interest': {
        const { data } = await apolloClient.query({
          query: GET_CONFLICTS_OF_INTEREST,
          variables: {
            mpId: input.mpId,
            billNumber: input.billNumber,
          },
        });
        return { success: true, data: data.conflictsOfInterest };
      }

      case 'search_lobby_registrations': {
        const { data } = await apolloClient.query({
          query: SEARCH_LOBBY_REGISTRATIONS,
          variables: {
            clientName: input.clientName,
            lobbyistName: input.lobbyistName,
            subjectMatter: input.subjectMatter,
            limit: input.limit ?? 20,
          },
        });
        return { success: true, data: data.searchLobbyRegistrations };
      }

      // ============================================
      // Navigation Tools
      // ============================================
      case 'navigate_to_hansard': {
        // Build URL with query parameters
        const params = new URLSearchParams();
        if (input.searchTerm) params.set('q', input.searchTerm);
        if (input.mpId) params.set('mp', input.mpId);
        if (input.party) params.set('party', input.party);
        if (input.documentType) params.set('docType', input.documentType);
        if (input.excludeProcedural) params.set('excludeProcedural', 'true');
        if (input.startDate) params.set('startDate', input.startDate);
        if (input.endDate) params.set('endDate', input.endDate);

        const url = `/hansard?${params.toString()}`;

        return {
          success: true,
          data: {
            _navigation: {
              url,
              message: `I've prepared a Hansard search page for you with ${input.searchTerm ? `"${input.searchTerm}"` : 'your search'}. Click the link below to view the full results with interactive cards and advanced filtering.`,
            },
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format tool result for Claude
 */
export function formatToolResult(result: ToolResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (!result.data) {
    return 'No data found';
  }

  // Check if this is a navigation result with nested data
  if (result.data._navigation) {
    // If there's both results and navigation, show the results to Claude
    // but indicate that navigation is available
    if (result.data.results) {
      return JSON.stringify({
        ...result.data.results,
        _note: `Navigation prepared: ${result.data._navigation.message}`,
      }, null, 2);
    }

    // If only navigation (no results), return navigation info
    return JSON.stringify({
      navigation: result.data._navigation,
      message: 'Navigation link prepared for user',
    }, null, 2);
  }

  // Return JSON string for Claude to interpret
  return JSON.stringify(result.data, null, 2);
}

/**
 * Check if a tool result contains navigation
 */
export function hasNavigation(result: ToolResult): boolean {
  return result.success && result.data?._navigation !== undefined;
}

/**
 * Extract navigation data from tool result
 */
export function extractNavigation(result: ToolResult): { url: string; message: string } | null {
  if (hasNavigation(result)) {
    return result.data._navigation;
  }
  return null;
}
