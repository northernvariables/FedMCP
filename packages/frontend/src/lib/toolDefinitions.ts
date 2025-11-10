/**
 * Claude Tool Definitions
 *
 * Defines tools that Claude can call to query the Neo4j database
 */

import type Anthropic from '@anthropic-ai/sdk';

export const tools: Anthropic.Tool[] = [
  // ============================================
  // MP Tools
  // ============================================
  {
    name: 'search_mps',
    description: 'Search for Members of Parliament by name, party, or riding. Returns basic information about MPs including their party affiliation, riding, and cabinet positions.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Search term to match against MP name or riding (optional)',
        },
        party: {
          type: 'string',
          description: 'Filter by party name (e.g., "Liberal", "Conservative", "NDP", "Bloc Québécois", "Green")',
        },
        current: {
          type: 'boolean',
          description: 'Only return currently serving MPs (default: true)',
        },
        cabinetOnly: {
          type: 'boolean',
          description: 'Only return cabinet ministers (default: false)',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_mp',
    description: 'Get detailed information about a specific MP including their biography, contact information, sponsored bills, expenses, and committee memberships. Use this after finding an MP with search_mps.',
    input_schema: {
      type: 'object',
      properties: {
        mpId: {
          type: 'string',
          description: 'The MP ID (e.g., "pierre-poilievre", "chrystia-freeland")',
        },
      },
      required: ['mpId'],
    },
  },
  {
    name: 'get_mp_scorecard',
    description: 'Get a comprehensive performance scorecard for an MP including bills sponsored, votes cast, speeches made, committee participation, expenses, and lobbying interactions. Useful for evaluating MP activity and effectiveness.',
    input_schema: {
      type: 'object',
      properties: {
        mpId: {
          type: 'string',
          description: 'The MP ID (e.g., "pierre-poilievre")',
        },
      },
      required: ['mpId'],
    },
  },
  {
    name: 'get_mp_speeches',
    description: 'Get recent speeches and statements made by an MP in the House of Commons. Returns Hansard excerpts with timestamps and context.',
    input_schema: {
      type: 'object',
      properties: {
        mpId: {
          type: 'string',
          description: 'The MP ID',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of speeches to return (default: 20)',
        },
      },
      required: ['mpId'],
    },
  },

  // ============================================
  // Bill Tools
  // ============================================
  {
    name: 'search_bills',
    description: 'Search for bills by number (e.g., "C-47") or keywords in the title/summary. Returns bill details including status, sponsors, and legislative progress.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Bill number (e.g., "C-47") or keywords to search in title and summary',
        },
        session: {
          type: 'string',
          description: 'Parliamentary session (e.g., "44-1" for 44th Parliament, 1st Session)',
        },
        status: {
          type: 'string',
          description: 'Filter by bill status (e.g., "Royal Assent", "First Reading", "Committee")',
        },
        billType: {
          type: 'string',
          description: 'Filter by bill type (e.g., "Government Bill", "Private Member\'s Bill")',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of results (default: 20)',
        },
      },
    },
  },
  {
    name: 'get_bill',
    description: 'Get detailed information about a specific bill including full text, sponsors, votes, legislative history, and current status.',
    input_schema: {
      type: 'object',
      properties: {
        billNumber: {
          type: 'string',
          description: 'Bill number (e.g., "C-47", "S-12")',
        },
        session: {
          type: 'string',
          description: 'Parliamentary session (e.g., "44-1")',
        },
      },
      required: ['billNumber', 'session'],
    },
  },
  {
    name: 'get_bill_lobbying',
    description: 'Get lobbying activity related to a specific bill. Shows which organizations and lobbyists have registered communications about this bill, revealing corporate and special interest influence.',
    input_schema: {
      type: 'object',
      properties: {
        billNumber: {
          type: 'string',
          description: 'Bill number (e.g., "C-47")',
        },
        session: {
          type: 'string',
          description: 'Parliamentary session (e.g., "44-1")',
        },
      },
      required: ['billNumber', 'session'],
    },
  },
  {
    name: 'get_bill_debates',
    description: 'Get House of Commons debates and speeches about a specific bill. Returns Hansard excerpts showing what MPs have said about the bill.',
    input_schema: {
      type: 'object',
      properties: {
        billNumber: {
          type: 'string',
          description: 'Bill number (e.g., "C-47")',
        },
        session: {
          type: 'string',
          description: 'Parliamentary session (e.g., "44-1")',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of statements to return (default: 50)',
        },
      },
      required: ['billNumber', 'session'],
    },
  },

  // ============================================
  // Hansard/Debate Tools
  // ============================================
  {
    name: 'search_hansard',
    description: 'COMPREHENSIVE search through House of Commons debates (Hansard transcripts). Uses full-text search to find specific keywords, quotes, or topics in all parliamentary speeches. Returns complete speech excerpts with context, speaker information, dates, and related bills. This is the primary tool for finding what MPs have said about ANY issue in Parliament.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Keywords or phrases to search for in debate transcripts. Supports boolean operators (AND, OR, NOT) and phrase matching with quotes. Examples: "climate change", "carbon tax AND emissions", "healthcare OR medicare"',
        },
        mpId: {
          type: 'string',
          description: 'Filter results to speeches by a specific MP (optional). Use the MP ID format like "pierre-poilievre"',
        },
        committeeCode: {
          type: 'string',
          description: 'Filter results to committee evidence/testimony (optional). Use committee code like "FINA" for Finance Committee, "HESA" for Health Committee. Only applies to Evidence documents (type "E").',
        },
        documentType: {
          type: 'string',
          description: 'Filter by document type (optional). "D" = House of Commons Debates (floor speeches), "E" = Committee Evidence/Testimony. Leave blank to search all types.',
          enum: ['D', 'E'],
        },
        excludeProcedural: {
          type: 'boolean',
          description: 'Exclude procedural/administrative statements (default: false). Set to true to filter out routine procedural business and focus on substantive debate.',
        },
        startDate: {
          type: 'string',
          description: 'Filter speeches after this date (YYYY-MM-DD) (optional)',
        },
        endDate: {
          type: 'string',
          description: 'Filter speeches before this date (YYYY-MM-DD) (optional)',
        },
        language: {
          type: 'string',
          description: 'Search in English ("en") or French ("fr") transcripts (default: "en")',
          enum: ['en', 'fr'],
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 50, max: 100). Increase for comprehensive topic research.',
        },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'get_recent_debates',
    description: 'Get the most recent debates and statements from the House of Commons.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Maximum number of debates to return (default: 20)',
        },
      },
    },
  },

  // ============================================
  // Committee Tools
  // ============================================
  {
    name: 'get_committees',
    description: 'Get a list of all parliamentary committees including their mandates, membership, and meeting schedules.',
    input_schema: {
      type: 'object',
      properties: {
        current: {
          type: 'boolean',
          description: 'Only return currently active committees (default: true)',
        },
      },
    },
  },
  {
    name: 'get_committee',
    description: 'Get detailed information about a specific committee including members, mandate, and meeting history.',
    input_schema: {
      type: 'object',
      properties: {
        committeeCode: {
          type: 'string',
          description: 'Committee code (e.g., "FINA" for Finance Committee)',
        },
      },
      required: ['committeeCode'],
    },
  },
  {
    name: 'get_committee_testimony',
    description: 'Get witness testimony and statements from committee meetings. Useful for understanding expert input on legislation and policy issues.',
    input_schema: {
      type: 'object',
      properties: {
        committeeCode: {
          type: 'string',
          description: 'Committee code (e.g., "FINA")',
        },
        startDate: {
          type: 'string',
          description: 'Filter testimony after this date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Filter testimony before this date (YYYY-MM-DD)',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of testimonies to return (default: 50)',
        },
      },
      required: ['committeeCode'],
    },
  },

  // ============================================
  // Accountability/Lobbying Tools
  // ============================================
  {
    name: 'get_top_spenders',
    description: 'Get the MPs who spent the most in a given fiscal quarter on office expenses, travel, hospitality, contracts, etc. Useful for expense accountability.',
    input_schema: {
      type: 'object',
      properties: {
        fiscalYear: {
          type: 'integer',
          description: 'Fiscal year (e.g., 2024)',
        },
        quarter: {
          type: 'integer',
          description: 'Quarter number (1-4)',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of MPs to return (default: 10)',
        },
      },
      required: ['fiscalYear', 'quarter'],
    },
  },
  {
    name: 'detect_conflicts_of_interest',
    description: 'Analyze potential conflicts of interest by cross-referencing MP voting records with lobbying activity and expenses. Shows if an MP voted on bills that were lobbied on by organizations they had financial dealings with.',
    input_schema: {
      type: 'object',
      properties: {
        mpId: {
          type: 'string',
          description: 'MP ID to analyze (optional - analyzes all MPs if not specified)',
        },
        billNumber: {
          type: 'string',
          description: 'Bill number to analyze lobbying for (optional)',
        },
      },
    },
  },
  {
    name: 'search_lobby_registrations',
    description: 'Search lobbying registry to find who is lobbying the government and on what issues. Shows corporate and special interest influence on policy.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Name of the organization doing the lobbying (e.g., "Pfizer", "Canadian Bankers Association")',
        },
        lobbyistName: {
          type: 'string',
          description: 'Name of the lobbyist',
        },
        subjectMatter: {
          type: 'string',
          description: 'Keywords in the subject matter being lobbied',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of registrations to return (default: 20)',
        },
      },
    },
  },

  // ============================================
  // Navigation Tools
  // ============================================
  {
    name: 'navigate_to_hansard',
    description: 'Navigate the user to the Hansard search page with pre-filled search parameters. Use this when the user wants to explore or browse Hansard records beyond just getting search results. This opens a dedicated page with cards displaying speeches, advanced filtering options, and the ability to interact with results.',
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Search query to pre-fill (optional)',
        },
        mpId: {
          type: 'string',
          description: 'Filter by specific MP (optional)',
        },
        party: {
          type: 'string',
          description: 'Filter by party (optional)',
        },
        documentType: {
          type: 'string',
          description: 'Filter by document type: "D" (Debates) or "E" (Committee Evidence) (optional)',
          enum: ['D', 'E'],
        },
        excludeProcedural: {
          type: 'boolean',
          description: 'Exclude procedural statements (optional)',
        },
        startDate: {
          type: 'string',
          description: 'Filter speeches after this date (YYYY-MM-DD) (optional)',
        },
        endDate: {
          type: 'string',
          description: 'Filter speeches before this date (YYYY-MM-DD) (optional)',
        },
      },
      required: ['searchTerm'],
    },
  },
];
