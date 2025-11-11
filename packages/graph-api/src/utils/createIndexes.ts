/**
 * Neo4j Index Creation Script
 *
 * Creates indexes to optimize frequently used query patterns.
 * Run this script whenever the schema changes or after fresh data import.
 *
 * Usage:
 *   npm run create-indexes
 *   OR
 *   node -r tsx/register src/utils/createIndexes.ts
 */

import { getDriver, initializeDriver, closeDriver } from '../neo4j.js';

interface IndexDefinition {
  name: string;
  label: string;
  properties: string[];
  description: string;
}

/**
 * Index definitions for optimal query performance
 */
const indexes: IndexDefinition[] = [
  // ============================================
  // MP Indexes
  // ============================================
  {
    name: 'mp_current_idx',
    label: 'MP',
    properties: ['current'],
    description: 'Frequently filtered for current MPs in queries'
  },
  {
    name: 'mp_party_idx',
    label: 'MP',
    properties: ['party'],
    description: 'Party filtering in search and dashboard queries'
  },
  {
    name: 'mp_name_idx',
    label: 'MP',
    properties: ['name'],
    description: 'Text search and alphabetical sorting'
  },
  {
    name: 'mp_id_idx',
    label: 'MP',
    properties: ['id'],
    description: 'Primary key lookups (may already exist from @unique)'
  },

  // Composite indexes for common query patterns
  {
    name: 'mp_current_party_idx',
    label: 'MP',
    properties: ['current', 'party'],
    description: 'Combined filter: current MPs by party (dashboard, search)'
  },
  {
    name: 'mp_current_name_idx',
    label: 'MP',
    properties: ['current', 'name'],
    description: 'Combined filter: current MPs with name sorting'
  },

  // ============================================
  // Expense Indexes
  // ============================================
  {
    name: 'expense_fiscal_year_idx',
    label: 'Expense',
    properties: ['fiscal_year'],
    description: 'Filtered by fiscal year in topSpenders and trends'
  },
  {
    name: 'expense_mp_id_idx',
    label: 'Expense',
    properties: ['mp_id'],
    description: 'Join key for MP expense relationships'
  },
  {
    name: 'expense_fiscal_quarter_idx',
    label: 'Expense',
    properties: ['fiscal_year', 'quarter'],
    description: 'Combined filter for quarterly expense queries'
  },

  // ============================================
  // Bill Indexes
  // ============================================
  {
    name: 'bill_number_session_idx',
    label: 'Bill',
    properties: ['number', 'session'],
    description: 'Primary composite key for bill lookups'
  },
  {
    name: 'bill_status_idx',
    label: 'Bill',
    properties: ['status'],
    description: 'Filtering active/passed bills'
  },
  {
    name: 'bill_introduced_date_idx',
    label: 'Bill',
    properties: ['introduced_date'],
    description: 'Date sorting in bill lists'
  },

  // ============================================
  // Statement (Hansard) Indexes
  // ============================================
  {
    name: 'statement_time_idx',
    label: 'Statement',
    properties: ['time'],
    description: 'Date sorting for recent debates/speeches'
  },
  {
    name: 'statement_thread_id_idx',
    label: 'Statement',
    properties: ['thread_id'],
    description: 'Grouping threaded conversations'
  },
  {
    name: 'statement_politician_id_idx',
    label: 'Statement',
    properties: ['politician_id'],
    description: 'Join key for MP statements - used in MP detail page queries'
  },
  {
    name: 'statement_member_id_idx',
    label: 'Statement',
    properties: ['member_id'],
    description: 'Alternative join key for MP statements'
  },
  {
    name: 'statement_document_id_idx',
    label: 'Statement',
    properties: ['document_id'],
    description: 'Join key for document-statement relationships'
  },
  {
    name: 'statement_bill_debated_id_idx',
    label: 'Statement',
    properties: ['bill_debated_id'],
    description: 'Filter statements by bill being debated'
  },

  // ============================================
  // Document Indexes
  // ============================================
  {
    name: 'document_date_idx',
    label: 'Document',
    properties: ['date'],
    description: 'Date sorting for recent debates'
  },
  {
    name: 'document_type_idx',
    label: 'Document',
    properties: ['document_type'],
    description: 'Filtering by document type (D=Debates, E=Evidence)'
  },

  // ============================================
  // Vote Indexes
  // ============================================
  {
    name: 'vote_date_idx',
    label: 'Vote',
    properties: ['date'],
    description: 'Date sorting for recent votes'
  },
  {
    name: 'vote_session_idx',
    label: 'Vote',
    properties: ['session'],
    description: 'Filtering votes by parliamentary session'
  },
  {
    name: 'vote_bill_number_idx',
    label: 'Vote',
    properties: ['bill_number'],
    description: 'Join key for vote-bill relationships without traversing relationships'
  },
  {
    name: 'vote_result_idx',
    label: 'Vote',
    properties: ['result'],
    description: 'Filter votes by result (Passed, Failed, Tied)'
  },

  // ============================================
  // Role Indexes (Ministerial Positions)
  // ============================================
  {
    name: 'role_person_id_idx',
    label: 'Role',
    properties: ['person_id'],
    description: 'Join key for MP role relationships'
  },
  {
    name: 'role_is_current_idx',
    label: 'Role',
    properties: ['is_current'],
    description: 'Filter current vs historical roles'
  },
  {
    name: 'role_person_current_idx',
    label: 'Role',
    properties: ['person_id', 'is_current'],
    description: 'Combined filter: current roles by person'
  },

  // ============================================
  // Committee Indexes
  // ============================================
  {
    name: 'committee_chamber_idx',
    label: 'Committee',
    properties: ['chamber'],
    description: 'Filter committees by chamber (House, Senate, Joint)'
  },

  // ============================================
  // Meeting Indexes
  // ============================================
  {
    name: 'meeting_date_idx',
    label: 'Meeting',
    properties: ['date'],
    description: 'Date sorting and filtering for committee meetings'
  },
  {
    name: 'meeting_committee_code_idx',
    label: 'Meeting',
    properties: ['committee_code'],
    description: 'Filter meetings by committee'
  },

  // ============================================
  // Riding Indexes
  // ============================================
  {
    name: 'riding_province_idx',
    label: 'Riding',
    properties: ['province'],
    description: 'Filter ridings by province for geographic queries'
  },

  // ============================================
  // Party Indexes
  // ============================================
  {
    name: 'party_code_idx',
    label: 'Party',
    properties: ['code'],
    description: 'Party code lookups (Liberal, Conservative, NDP, etc.)'
  },

  // ============================================
  // Organization Indexes (Lobbying)
  // ============================================
  {
    name: 'organization_id_idx',
    label: 'Organization',
    properties: ['id'],
    description: 'Primary key lookups for organization profiles'
  },
  {
    name: 'organization_name_idx',
    label: 'Organization',
    properties: ['name'],
    description: 'Organization name lookups and search'
  },
  {
    name: 'organization_industry_idx',
    label: 'Organization',
    properties: ['industry'],
    description: 'Filter organizations by industry sector'
  },

  // ============================================
  // Lobbyist Indexes
  // ============================================
  {
    name: 'lobbyist_id_idx',
    label: 'Lobbyist',
    properties: ['id'],
    description: 'Primary key lookups for lobbyist profiles'
  },
  {
    name: 'lobbyist_name_idx',
    label: 'Lobbyist',
    properties: ['name'],
    description: 'Lobbyist name lookups and search'
  },
  {
    name: 'lobbyist_firm_idx',
    label: 'Lobbyist',
    properties: ['firm'],
    description: 'Filter lobbyists by firm/organization'
  },

  // ============================================
  // Lobby Registration Indexes
  // ============================================
  {
    name: 'lobby_registration_active_idx',
    label: 'LobbyRegistration',
    properties: ['active'],
    description: 'Filter active vs inactive lobby registrations'
  },
  {
    name: 'lobby_registration_client_idx',
    label: 'LobbyRegistration',
    properties: ['client_org_name'],
    description: 'Lookups by client organization name'
  },
  {
    name: 'lobby_registration_reg_number_idx',
    label: 'LobbyRegistration',
    properties: ['reg_number'],
    description: 'Unique registration number lookups'
  },
  {
    name: 'lobby_registration_effective_date_idx',
    label: 'LobbyRegistration',
    properties: ['effective_date'],
    description: 'Date sorting and temporal filtering'
  },

  // ============================================
  // Lobby Communication Indexes
  // ============================================
  {
    name: 'lobby_communication_date_idx',
    label: 'LobbyCommunication',
    properties: ['date'],
    description: 'Date sorting for recent lobbying activity'
  },
  {
    name: 'lobby_communication_client_idx',
    label: 'LobbyCommunication',
    properties: ['client_org_name'],
    description: 'Filter communications by client organization'
  },
];

/**
 * Full-text search indexes for content queries
 */
const fulltextIndexes = [
  {
    name: 'statement_content_en',
    labels: ['Statement'],
    properties: ['content_en', 'h1_en', 'h2_en', 'h3_en'],
    description: 'English full-text search across Hansard statements'
  },
  {
    name: 'statement_content_fr',
    labels: ['Statement'],
    properties: ['content_fr', 'h1_fr', 'h2_fr', 'h3_fr'],
    description: 'French full-text search across Hansard statements'
  },
  {
    name: 'bill_search',
    labels: ['Bill'],
    properties: ['title', 'title_fr', 'summary', 'summary_fr'],
    description: 'Full-text search for bills by title and summary (both languages)'
  },
  {
    name: 'organization_search',
    labels: ['Organization'],
    properties: ['name', 'industry'],
    description: 'Full-text search for organizations by name and industry'
  },
  {
    name: 'lobbyist_search',
    labels: ['Lobbyist'],
    properties: ['name', 'firm'],
    description: 'Full-text search for lobbyists by name and firm'
  },
];

/**
 * Check if an index already exists
 */
async function indexExists(session: any, indexName: string): Promise<boolean> {
  const result = await session.run('SHOW INDEXES YIELD name WHERE name = $name RETURN count(*) AS count', {
    name: indexName
  });
  const count = result.records[0].get('count').toNumber();
  return count > 0;
}

/**
 * Create a single property or composite index
 */
async function createIndex(session: any, index: IndexDefinition): Promise<void> {
  const exists = await indexExists(session, index.name);

  if (exists) {
    console.log(`⏭️  Index '${index.name}' already exists - skipping`);
    return;
  }

  const propertyList = index.properties.map(p => `n.${p}`).join(', ');
  const cypherQuery = `CREATE INDEX ${index.name} IF NOT EXISTS FOR (n:${index.label}) ON (${propertyList})`;

  try {
    await session.run(cypherQuery);
    console.log(`✅ Created index: ${index.name}`);
    console.log(`   Label: ${index.label}`);
    console.log(`   Properties: ${index.properties.join(', ')}`);
    console.log(`   Purpose: ${index.description}`);
  } catch (error: any) {
    console.error(`❌ Failed to create index '${index.name}':`, error.message);
    throw error;
  }
}

/**
 * Create a full-text search index
 */
async function createFulltextIndex(session: any, ftIndex: any): Promise<void> {
  const exists = await indexExists(session, ftIndex.name);

  if (exists) {
    console.log(`⏭️  Full-text index '${ftIndex.name}' already exists - skipping`);
    return;
  }

  const labelsStr = ftIndex.labels.map((l: string) => `"${l}"`).join(', ');
  const propsStr = ftIndex.properties.map((p: string) => `n.${p}`).join(', ');
  const cypherQuery = `CREATE FULLTEXT INDEX ${ftIndex.name} IF NOT EXISTS FOR (n:${ftIndex.labels[0]}) ON EACH [${propsStr}]`;

  try {
    await session.run(cypherQuery);
    console.log(`✅ Created full-text index: ${ftIndex.name}`);
    console.log(`   Labels: ${ftIndex.labels.join(', ')}`);
    console.log(`   Properties: ${ftIndex.properties.join(', ')}`);
    console.log(`   Purpose: ${ftIndex.description}`);
  } catch (error: any) {
    console.error(`❌ Failed to create full-text index '${ftIndex.name}':`, error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Neo4j Index Creation Script\n');
  console.log('This script will create indexes to optimize query performance.\n');

  let driver;
  let session;

  try {
    // Initialize driver
    driver = initializeDriver();
    session = driver.session();

    console.log('📊 Creating property indexes...\n');

    // Create property indexes
    for (const index of indexes) {
      await createIndex(session, index);
      console.log(''); // Empty line for readability
    }

    console.log('📝 Creating full-text search indexes...\n');

    // Create full-text indexes
    for (const ftIndex of fulltextIndexes) {
      await createFulltextIndex(session, ftIndex);
      console.log(''); // Empty line for readability
    }

    console.log('✅ All indexes created successfully!\n');

    // Show final index list
    console.log('📋 Current indexes in database:\n');
    const result = await session.run('SHOW INDEXES YIELD name, type, labelsOrTypes, properties RETURN name, type, labelsOrTypes, properties ORDER BY name');

    for (const record of result.records) {
      const name = record.get('name');
      const type = record.get('type');
      const labels = record.get('labelsOrTypes');
      const props = record.get('properties');

      console.log(`  ${name}`);
      console.log(`    Type: ${type}`);
      console.log(`    Labels: ${labels?.join(', ') || 'N/A'}`);
      console.log(`    Properties: ${props?.join(', ') || 'N/A'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    if (session) {
      await session.close();
    }
    if (driver) {
      await closeDriver();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('✅ Index creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Index creation failed:', error);
      process.exit(1);
    });
}

export { createIndex, createFulltextIndex, indexes, fulltextIndexes };
