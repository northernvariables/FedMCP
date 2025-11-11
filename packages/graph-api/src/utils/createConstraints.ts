/**
 * Neo4j Constraint Creation Script
 *
 * Creates uniqueness constraints to ensure data integrity and improve performance.
 * Constraints automatically create backing indexes.
 *
 * Usage:
 *   npm run create-constraints
 *   OR
 *   node -r tsx/register src/utils/createConstraints.ts
 */

import { getDriver, initializeDriver, closeDriver } from '../neo4j.js';

interface ConstraintDefinition {
  name: string;
  label: string;
  properties: string[];
  description: string;
}

/**
 * Uniqueness constraint definitions
 */
const constraints: ConstraintDefinition[] = [
  // ============================================
  // MP Constraints
  // ============================================
  {
    name: 'mp_id_unique',
    label: 'MP',
    properties: ['id'],
    description: 'Ensure MP IDs are unique across all MPs'
  },

  // ============================================
  // Organization Constraints (Lobbying)
  // ============================================
  {
    name: 'organization_id_unique',
    label: 'Organization',
    properties: ['id'],
    description: 'Ensure Organization IDs are unique'
  },

  // ============================================
  // Lobbyist Constraints
  // ============================================
  {
    name: 'lobbyist_id_unique',
    label: 'Lobbyist',
    properties: ['id'],
    description: 'Ensure Lobbyist IDs are unique'
  },

  // ============================================
  // Lobby Registration Constraints
  // ============================================
  {
    name: 'lobby_registration_id_unique',
    label: 'LobbyRegistration',
    properties: ['id'],
    description: 'Ensure Lobby Registration IDs are unique'
  },

  // ============================================
  // Lobby Communication Constraints
  // ============================================
  {
    name: 'lobby_communication_id_unique',
    label: 'LobbyCommunication',
    properties: ['id'],
    description: 'Ensure Lobby Communication IDs are unique'
  },

  // ============================================
  // Bill Constraints
  // ============================================
  {
    name: 'bill_number_session_unique',
    label: 'Bill',
    properties: ['number', 'session'],
    description: 'Ensure bills are unique by number and session'
  },

  // ============================================
  // Party Constraints
  // ============================================
  {
    name: 'party_code_unique',
    label: 'Party',
    properties: ['code'],
    description: 'Ensure party codes are unique (Liberal, Conservative, NDP, etc.)'
  },

  // ============================================
  // Riding Constraints
  // ============================================
  {
    name: 'riding_id_unique',
    label: 'Riding',
    properties: ['id'],
    description: 'Ensure riding IDs are unique across all constituencies'
  },

  // ============================================
  // Vote Constraints
  // ============================================
  {
    name: 'vote_id_unique',
    label: 'Vote',
    properties: ['id'],
    description: 'Ensure vote IDs are unique'
  },

  // ============================================
  // Statement Constraints
  // ============================================
  {
    name: 'statement_id_unique',
    label: 'Statement',
    properties: ['id'],
    description: 'Ensure statement IDs are unique across all Hansard statements'
  },

  // ============================================
  // Document Constraints
  // ============================================
  {
    name: 'document_id_unique',
    label: 'Document',
    properties: ['id'],
    description: 'Ensure document IDs are unique'
  },

  // ============================================
  // Committee Constraints
  // ============================================
  {
    name: 'committee_code_unique',
    label: 'Committee',
    properties: ['code'],
    description: 'Ensure committee codes are unique'
  },

  // ============================================
  // Petition Constraints
  // ============================================
  {
    name: 'petition_id_unique',
    label: 'Petition',
    properties: ['id'],
    description: 'Ensure petition IDs are unique'
  },
];

/**
 * Check if a constraint already exists
 */
async function constraintExists(session: any, constraintName: string): Promise<boolean> {
  const result = await session.run(
    'SHOW CONSTRAINTS YIELD name WHERE name = $name RETURN count(*) AS count',
    { name: constraintName }
  );
  const count = result.records[0].get('count').toNumber();
  return count > 0;
}

/**
 * Create a uniqueness constraint
 */
async function createConstraint(session: any, constraint: ConstraintDefinition): Promise<void> {
  const exists = await constraintExists(session, constraint.name);

  if (exists) {
    console.log(`⏭️  Constraint '${constraint.name}' already exists - skipping`);
    return;
  }

  // Build the constraint syntax
  let cypherQuery: string;
  if (constraint.properties.length === 1) {
    // Single property constraint
    cypherQuery = `CREATE CONSTRAINT ${constraint.name} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE n.${constraint.properties[0]} IS UNIQUE`;
  } else {
    // Composite property constraint
    const propertyList = constraint.properties.map(p => `n.${p}`).join(', ');
    cypherQuery = `CREATE CONSTRAINT ${constraint.name} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE (${propertyList}) IS UNIQUE`;
  }

  try {
    await session.run(cypherQuery);
    console.log(`✅ Created constraint: ${constraint.name}`);
    console.log(`   Label: ${constraint.label}`);
    console.log(`   Properties: ${constraint.properties.join(', ')}`);
    console.log(`   Purpose: ${constraint.description}`);
  } catch (error: any) {
    console.error(`❌ Failed to create constraint '${constraint.name}':`, error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Neo4j Constraint Creation Script\n');
  console.log('This script will create uniqueness constraints for data integrity.\n');

  let driver;
  let session;

  try {
    // Initialize driver
    driver = initializeDriver();
    session = driver.session();

    console.log('🔒 Creating uniqueness constraints...\n');

    // Create constraints
    for (const constraint of constraints) {
      await createConstraint(session, constraint);
      console.log(''); // Empty line for readability
    }

    console.log('✅ All constraints created successfully!\n');

    // Show final constraint list
    console.log('📋 Current constraints in database:\n');
    const result = await session.run(
      'SHOW CONSTRAINTS YIELD name, type, labelsOrTypes, properties RETURN name, type, labelsOrTypes, properties ORDER BY name'
    );

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
    console.error('❌ Error creating constraints:', error);
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
      console.log('✅ Constraint creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Constraint creation failed:', error);
      process.exit(1);
    });
}

export { createConstraint, constraints };
