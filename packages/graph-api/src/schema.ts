/**
 * GraphQL Schema using @neo4j/graphql
 *
 * This schema is automatically mapped to Neo4j nodes and relationships.
 * The @neo4j/graphql library generates resolvers, filters, and pagination.
 */

export const typeDefs = `#graphql
  # ============================================
  # People & Organizations
  # ============================================

  type MP @node {
    id: ID! @unique
    name: String!
    given_name: String
    family_name: String
    gender: String
    party: String
    riding: String
    current: Boolean!
    elected_date: Date
    email: String
    phone: String
    twitter: String
    wikipedia_id: String
    constituency_office: String
    ourcommons_url: String
    cabinet_position: String

    # House of Commons seating information
    parl_mp_id: Int  # House of Commons PersonId for matching
    seat_row: Int  # Row number in chamber (1-12 across both sides)
    seat_column: Int  # Column position within row
    bench_section: String  # "government" | "opposition" | "speaker"
    seat_visual_x: Float  # SVG X coordinate for rendering
    seat_visual_y: Float  # SVG Y coordinate for rendering

    updated_at: DateTime!

    # Relationships
    memberOf: Party @relationship(type: "MEMBER_OF", direction: OUT)
    represents: Riding @relationship(type: "REPRESENTS", direction: OUT)
    sponsored: [Bill!]! @relationship(type: "SPONSORED", direction: OUT)
    voted: [Vote!]! @relationship(type: "VOTED", direction: OUT, properties: "VotedProperties")
    sponsoredPetitions: [Petition!]! @relationship(type: "SPONSORED", direction: OUT)
    expenses: [Expense!]! @relationship(type: "INCURRED", direction: OUT)
    metWith: [Lobbyist!]! @relationship(type: "MET_WITH", direction: IN, properties: "MetWithProperties")
    servedOn: [Committee!]! @relationship(type: "SERVES_ON", direction: OUT, properties: "ServedOnProperties")
    roles: [Role!]! @relationship(type: "HOLDS_ROLE", direction: OUT)
    speeches: [Statement!]! @relationship(type: "MADE_BY", direction: IN)
  }

  type Senator @node {
    id: ID! @unique
    name: String!
    name_with_title: String
    current: Boolean!
    updated_at: DateTime!

    # Relationships
    sponsored: [Bill!]! @relationship(type: "SPONSORED", direction: OUT)
  }

  type Party @node {
    code: ID! @unique
    name: String!
    short_name: String
    leader_name: String
    seats: Int
    updated_at: DateTime!

    # Relationships
    members: [MP!]! @relationship(type: "MEMBER_OF", direction: IN)
    receivedDonations: [Donation!]! @relationship(type: "RECEIVED", direction: OUT)
  }

  type Riding @node {
    id: ID! @unique
    name: String!
    province: String
    population: Int
    is_vacant: Boolean
    vacant_since: Date

    # Relationships
    representedBy: [MP!]! @relationship(type: "REPRESENTS", direction: IN)
  }

  type Role @node {
    id: ID! @unique
    person_id: Int!
    title: String!
    role_type: String!
    from_date: DateTime!
    to_date: DateTime
    order_of_precedence: Int
    is_current: Boolean!
    updated_at: DateTime!

    # Relationships
    heldBy: MP @relationship(type: "HOLDS_ROLE", direction: IN)
  }

  type Organization @node {
    id: ID! @unique
    name: String!
    industry: String
    ceo: String

    # Relationships
    lobbyists: [Lobbyist!]! @relationship(type: "WORKS_FOR", direction: IN)
    registrations: [LobbyRegistration!]! @relationship(type: "ON_BEHALF_OF", direction: IN)
    lobbiedOn: [Bill!]! @relationship(type: "LOBBIED_ON", direction: OUT, properties: "LobbiedOnProperties")
    receivedContracts: [Contract!]! @relationship(type: "RECEIVED", direction: OUT)
    receivedGrants: [Grant!]! @relationship(type: "RECEIVED", direction: OUT)
    donated: [Party!]! @relationship(type: "DONATED", direction: OUT, properties: "DonatedProperties")
  }

  type Lobbyist @node {
    id: ID! @unique
    name: String!
    firm: String

    # Relationships
    worksFor: Organization @relationship(type: "WORKS_FOR", direction: OUT)
    registeredFor: [LobbyRegistration!]! @relationship(type: "REGISTERED_FOR", direction: OUT)
    metWith: [MP!]! @relationship(type: "MET_WITH", direction: OUT, properties: "MetWithProperties")
  }

  # ============================================
  # Legislative Entities
  # ============================================

  type Bill @node {
    # Basic identifiers
    number: String!
    session: String!
    parliament: Int
    session_number: Int

    # Titles
    title: String
    title_fr: String

    # Summary & description
    summary: String
    summary_fr: String
    full_summary_available: Boolean

    # Status & progress
    status: String
    status_fr: String
    stage: String
    latest_event: String

    # Bill classification
    bill_type: String
    bill_type_fr: String
    is_government_bill: Boolean
    is_private_member_bill: Boolean
    originating_chamber: String
    originating_chamber_fr: String
    is_proforma: Boolean
    bill_form: String

    # Sponsor info
    sponsor_name: String
    sponsor_mp_id: String

    # Dates - Introduction & reading stages
    introduced_date: Date
    passed_house_first_reading: Date
    passed_house_second_reading: Date
    passed_house_third_reading: Date
    passed_senate_first_reading: Date
    passed_senate_second_reading: Date
    passed_senate_third_reading: Date
    royal_assent: Date

    # Legacy date fields (for backward compatibility)
    passed_date: Date
    royal_assent_date: Date

    # Statute info (if passed into law)
    statute_year: Int
    statute_chapter: String

    # Cross-session relationships
    reinstated_from_previous: Boolean
    reinstated_from_bill: String

    # Metadata
    updated_at: DateTime!

    # Relationships
    sponsor: MP @relationship(type: "SPONSORED", direction: IN)
    senatorSponsor: Senator @relationship(type: "SPONSORED", direction: IN)
    votes: [Vote!]! @relationship(type: "SUBJECT_OF", direction: IN)
    hansardDebates: [Statement!]! @relationship(type: "MENTIONS", direction: IN, properties: "MentionsProperties")
    debates: [Debate!]! @relationship(type: "DISCUSSED", direction: IN)
    referredTo: [Committee!]! @relationship(type: "REFERRED_TO", direction: OUT)
    lobbiedOnBy: [Organization!]! @relationship(type: "LOBBIED_ON", direction: IN, properties: "LobbiedOnProperties")
    citedIn: [Case!]! @relationship(type: "CITED_IN", direction: OUT)
  }

  type Vote @node {
    id: ID! @unique
    number: Int!
    session: String!
    date: Date!
    result: String!
    yeas: Int!
    nays: Int!
    paired: Int
    bill_number: String
    description: String
    updated_at: DateTime!

    # Relationships
    voters: [MP!]! @relationship(type: "VOTED", direction: IN, properties: "VotedProperties")
    subjectOf: Bill @relationship(type: "SUBJECT_OF", direction: OUT)
  }

  type Debate @node {
    id: ID! @unique
    date: Date!
    topic: String
    hansard_url: String
    parliament: Int
    session: String

    # Video information (CPAC)
    cpac_video_url: String  # CPAC stream or episode URL
    cpac_episode_id: String  # CPAC episode identifier
    video_start_time: DateTime  # When video recording started
    video_duration: Int  # Duration in seconds

    # Relationships
    speakers: [MP!]! @relationship(type: "SPOKE_AT", direction: IN, properties: "SpokeAtProperties")
    discussed: Bill @relationship(type: "DISCUSSED", direction: OUT)
  }

  # ============================================
  # Hansard Documents & Statements
  # ============================================

  type Document @node {
    id: ID! @unique
    date: Date
    number: Int
    session_id: String
    document_type: String  # "D" = Debates, "E" = Evidence (Committee)
    source_id: String
    downloaded: Boolean
    public: Boolean
    xml_source_url: String
    updated_at: DateTime

    # Relationships
    statements: [Statement!]! @relationship(type: "PART_OF", direction: IN)
    presentedTo: Committee @relationship(type: "PRESENTED_TO", direction: OUT)
  }

  type Statement @node {
    id: ID! @unique
    document_id: Int
    time: DateTime
    politician_id: Int  # OpenParliament politician ID
    member_id: Int
    who_en: String  # Speaker display name (e.g., "Pierre Poilievre (Leader of the Opposition, CPC)")
    who_fr: String
    content_en: String  # Full statement text in English
    content_fr: String  # Full statement text in French
    h1_en: String  # Top-level heading (e.g., "Government Orders")
    h1_fr: String
    h2_en: String  # Sub-heading (e.g., "Budget Implementation Act, 2024")
    h2_fr: String
    h3_en: String  # Detail heading
    h3_fr: String
    statement_type: String  # "debate", "question", "answer", "interjection", etc.
    wordcount: Int
    procedural: Boolean
    bill_debated_id: Int  # OpenParliament bill ID
    bill_debate_stage: String  # "1", "2", "3" (reading stages)
    slug: String
    updated_at: DateTime

    # Threading fields
    thread_id: String  # Conversation group identifier
    parent_statement_id: String  # ID of statement this replies to
    sequence_in_thread: Int  # Order within conversation (0 = root)

    # Relationships
    madeBy: MP @relationship(type: "MADE_BY", direction: OUT)
    partOf: Document @relationship(type: "PART_OF", direction: OUT)
    mentions: Bill @relationship(type: "MENTIONS", direction: OUT, properties: "MentionsProperties")
    replyTo: Statement @relationship(type: "REPLIES_TO", direction: OUT)
    replies: [Statement!]! @relationship(type: "REPLIES_TO", direction: IN)
  }

  # Relationship properties for Statement → Bill (MENTIONS)
  type MentionsProperties @relationshipProperties {
    debate_stage: String  # Which reading stage: "1", "2", or "3"
  }

  type Committee @node {
    code: ID! @unique
    name: String!
    mandate: String
    chamber: String  # Nullable - historical committees may not have a specified chamber

    # Relationships
    members: [MP!]! @relationship(type: "SERVES_ON", direction: IN, properties: "ServedOnProperties")
    bills: [Bill!]! @relationship(type: "REFERRED_TO", direction: IN)
    meetings: [Meeting!]! @relationship(type: "HELD_MEETING", direction: OUT)
    evidence: [Document!]! @relationship(type: "PRESENTED_TO", direction: IN)
  }

  type Meeting @node {
    id: ID! @unique
    committee_code: String!
    date: Date!
    number: Int!
    in_camera: Boolean
    has_evidence: Boolean
    meeting_url: String
    session: String
    parliament: Int
    updated_at: DateTime

    # Relationships
    heldBy: Committee @relationship(type: "HELD_MEETING", direction: IN)
  }

  type Petition @node {
    number: ID! @unique
    title: String!
    text: String!
    signatures: Int!
    status: String!
    created_date: Date!
    closed_date: Date
    category: String

    # Relationships
    sponsor: MP @relationship(type: "SPONSORED", direction: IN)
  }

  # ============================================
  # Financial Entities
  # ============================================

  type Expense @node {
    id: ID! @unique
    mp_id: String!
    fiscal_year: Int!
    quarter: Int!
    category: String
    amount: Float!
    description: String

    # Relationships
    incurredBy: MP @relationship(type: "INCURRED", direction: IN)
  }

  type Contract @node {
    id: ID! @unique
    vendor: String!
    amount: Float!
    department: String!
    date: Date!
    delivery_date: Date
    description: String!
    owner_org: String

    # Relationships
    receivedBy: Organization @relationship(type: "RECEIVED", direction: IN)
  }

  type Grant @node {
    id: ID! @unique
    recipient: String!
    amount: Float!
    program_name: String!
    program_purpose: String
    agreement_date: Date!
    agreement_year: Int!
    start_date: Date
    end_date: Date
    owner_org: String!
    recipient_city: String
    recipient_province: String

    # Relationships
    receivedBy: Organization @relationship(type: "RECEIVED", direction: IN)
  }

  type Donation @node {
    id: ID! @unique
    donor_name: String!
    amount: Float!
    date: Date!
    contribution_year: Int!
    political_party: String!
    recipient_type: String!
    recipient_name: String!
    electoral_district: String
    donor_city: String
    donor_province: String

    # Relationships
    receivedBy: Party @relationship(type: "RECEIVED", direction: IN)
  }

  # ============================================
  # Lobbying
  # ============================================

  type LobbyRegistration @node {
    id: ID! @unique
    reg_number: String!
    client_org_name: String!
    registrant_name: String!
    effective_date: Date!
    end_date: Date
    active: Boolean!
    subject_matters: [String!]
    government_institutions: [String!]

    # Relationships
    registeredBy: Lobbyist @relationship(type: "REGISTERED_FOR", direction: IN)
    onBehalfOf: Organization @relationship(type: "ON_BEHALF_OF", direction: OUT)
  }

  type LobbyCommunication @node {
    id: ID! @unique
    client_org_name: String!
    registrant_name: String
    date: Date!
    dpoh_names: [String!]
    dpoh_titles: [String!]
    institutions: [String!]
    subject_matters: [String!]
  }

  # ============================================
  # Legal (CanLII)
  # ============================================

  type Case @node {
    id: ID! @unique
    citation: String!
    court: String!
    date: Date!
    summary: String
    canlii_url: String!

    # Relationships
    citedBills: [Bill!]! @relationship(type: "CITED_IN", direction: IN)
    citesLegislation: [Legislation!]! @relationship(type: "CITES", direction: OUT)
    citesCases: [Case!]! @relationship(type: "CITES", direction: OUT)
  }

  type Legislation @node {
    id: ID! @unique
    title: String!
    jurisdiction: String!
    type: String!
    date: Date

    # Relationships
    citedBy: [Case!]! @relationship(type: "CITES", direction: IN)
  }

  # ============================================
  # Relationship Properties
  # ============================================

  type VotedProperties @relationshipProperties {
    position: String!  # "yea", "nay", "paired"
  }

  type MetWithProperties @relationshipProperties {
    date: Date!
    topic: String
    dpoh_title: String
  }

  type ServedOnProperties @relationshipProperties {
    role: String
    start_date: Date
  }

  type SpokeAtProperties @relationshipProperties {
    timestamp: DateTime
    excerpt: String
  }

  type LobbiedOnProperties @relationshipProperties {
    date: Date!
    subject: String
  }

  type DonatedProperties @relationshipProperties {
    via: String  # "individual" or "corporate"
  }

  # ============================================
  # Custom Types for Analytics
  # ============================================

  type MPScorecard {
    mp: MP!
    bills_sponsored: Int!
    bills_passed: Int!
    votes_participated: Int!
    petitions_sponsored: Int!
    total_petition_signatures: Int!
    current_year_expenses: Float!
    lobbyist_meetings: Int!
    legislative_effectiveness: Float!
  }

  type MPExpenseSummary {
    mp: MP!
    total_expenses: Float!
  }

  # TODO: Implement as custom resolver (type currently disabled)
  # type GlobalExpenseStats {
  #   average_per_quarter: Float!
  #   median_per_quarter: Float!
  #   total_quarters: Int!
  # }

  type BillLobbyingActivity {
    bill: Bill!
    organizations_lobbying: Int!
    total_lobbying_events: Int!
    organizations: [OrganizationLobbyingSummary!]!
  }

  type OrganizationLobbyingSummary {
    name: String!
    industry: String
    lobbying_count: Int!
  }

  type ConflictOfInterest {
    mp: MP!
    organization: Organization!
    bill: Bill!
    suspicion_score: Int!
  }

  type PartySpendingTrend {
    quarter: Int!
    period: String!
    parties: [PartySpendingSummary!]!
    total_all_parties: Float!
  }

  type PartySpendingSummary {
    party: String!
    total_expenses: Float!
    mp_count: Int!
    average_per_mp: Float!
  }

  type CommitteeActivityMetrics {
    committee: Committee!
    total_meetings: Int!
    meetings_last_30_days: Int!
    meetings_last_90_days: Int!
    total_evidence_documents: Int!
    active_bills_count: Int!
    member_count: Int!
    avg_statements_per_meeting: Float!
  }

  type NewsArticle {
    title: String!
    url: String!
    source: String!
    published_date: String
    description: String
    image_url: String
  }


  # ============================================
  # Custom Queries (Accountability Analytics)
  # ============================================

  type Query {
    # MP Performance Scorecard
    mpScorecard(mpId: ID!): MPScorecard
      @cypher(
        statement: """
        MATCH (mp:MP {id: $mpId})
        WITH mp,
          CASE
            WHEN date().month < 4 THEN date().year
            ELSE date().year + 1
          END AS current_fiscal_year
        // Calculate each metric separately to avoid Cartesian products
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[:SPONSORED]->(bill:Bill)
          RETURN count(DISTINCT bill) AS bills_sponsored,
                 count(DISTINCT CASE WHEN bill.status = 'Passed' THEN bill END) AS bills_passed
        }
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[:VOTED]->(vote:Vote)
          RETURN count(DISTINCT vote) AS votes_participated
        }
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[:SPONSORED]->(petition:Petition)
          RETURN count(DISTINCT petition) AS petitions_sponsored,
                 sum(petition.signatures) AS total_petition_signatures
        }
        CALL {
          WITH mp, current_fiscal_year
          OPTIONAL MATCH (mp)-[:INCURRED]->(expense:Expense {fiscal_year: current_fiscal_year})
          RETURN sum(expense.amount) AS current_year_expenses
        }
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)<-[:MET_WITH]-(lobbyist:Lobbyist)
          RETURN count(DISTINCT lobbyist) AS lobbyist_meetings
        }
        RETURN {
          mp: {
            id: mp.id,
            name: mp.name,
            party: mp.party,
            riding: mp.riding,
            current: mp.current,
            cabinet_position: mp.cabinet_position
          },
          bills_sponsored: bills_sponsored,
          bills_passed: bills_passed,
          votes_participated: votes_participated,
          petitions_sponsored: petitions_sponsored,
          total_petition_signatures: COALESCE(total_petition_signatures, 0),
          current_year_expenses: COALESCE(current_year_expenses, 0.0),
          lobbyist_meetings: lobbyist_meetings,
          legislative_effectiveness: CASE
            WHEN bills_sponsored > 0
            THEN toFloat(bills_passed) / bills_sponsored * 100
            ELSE 0.0
          END
        } AS scorecard
        """
        columnName: "scorecard"
      )

    # Case-insensitive MP search
    searchMPs(
      searchTerm: String
      party: String
      current: Boolean
      cabinetOnly: Boolean
      limit: Int = 500
    ): [MP!]!
      @cypher(
        statement: """
        MATCH (mp:MP)
        WHERE ($current IS NULL OR mp.current = $current)
          AND ($party IS NULL OR mp.party = $party)
          AND ($cabinetOnly IS NULL OR $cabinetOnly = false OR mp.cabinet_position IS NOT NULL)
          AND (
            $searchTerm IS NULL OR $searchTerm = '' OR
            toLower(mp.name) CONTAINS toLower($searchTerm) OR
            toLower(COALESCE(mp.given_name, '')) CONTAINS toLower($searchTerm) OR
            toLower(COALESCE(mp.family_name, '')) CONTAINS toLower($searchTerm)
          )
        RETURN mp
        ORDER BY mp.name ASC
        LIMIT $limit
        """
        columnName: "mp"
      )

    # Case-insensitive Bill search with filters
    searchBills(
      searchTerm: String
      status: String
      session: String
      bill_type: String
      is_government_bill: Boolean
      originating_chamber: String
      limit: Int = 100
    ): [Bill!]!
      @cypher(
        statement: """
        MATCH (b:Bill)
        WHERE ($status IS NULL OR b.status = $status)
          AND ($session IS NULL OR b.session = $session)
          AND ($bill_type IS NULL OR b.bill_type = $bill_type)
          AND ($is_government_bill IS NULL OR b.is_government_bill = $is_government_bill)
          AND ($originating_chamber IS NULL OR b.originating_chamber = $originating_chamber)
          AND (
            $searchTerm IS NULL OR $searchTerm = '' OR
            toLower(COALESCE(b.title, '')) CONTAINS toLower($searchTerm) OR
            toLower(COALESCE(b.number, '')) CONTAINS toLower($searchTerm)
          )
        WITH b
        ORDER BY b.introduced_date DESC
        LIMIT $limit
        RETURN b
        """
        columnName: "b"
      )

    # Case-insensitive Lobbying search
    searchLobbyRegistrations(
      searchTerm: String
      active: Boolean
      limit: Int = 50
    ): [LobbyRegistration!]!
      @cypher(
        statement: """
        MATCH (l:LobbyRegistration)
        WHERE ($active IS NULL OR l.active = $active)
          AND (
            $searchTerm IS NULL OR $searchTerm = '' OR
            toLower(COALESCE(l.client_org_name, '')) CONTAINS toLower($searchTerm)
          )
        RETURN l
        ORDER BY l.effective_date DESC
        LIMIT $limit
        """
        columnName: "l"
      )

    # Top Spenders (MPs by expenses)
    topSpenders(fiscalYear: Int, limit: Int = 10): [MPExpenseSummary!]!
      @cypher(
        statement: """
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
        """
        columnName: "summary"
      )

    # Party Spending Trends (quarterly spending by party)
    partySpendingTrends(fiscalYear: Int): [PartySpendingTrend!]!
      @cypher(
        statement: """
        MATCH (mp:MP)-[:INCURRED]->(e:Expense)
        WHERE $fiscalYear IS NULL OR e.fiscal_year = $fiscalYear
        WITH
          CASE WHEN $fiscalYear IS NULL THEN e.fiscal_year ELSE $fiscalYear END AS fy,
          e.quarter AS quarter,
          mp.party AS party,
          e.amount AS amount,
          mp
        WITH fy, quarter, party, sum(amount) AS total_expenses, count(DISTINCT mp.id) AS mp_count
        WITH fy, quarter, collect({
          party: party,
          total_expenses: total_expenses,
          mp_count: mp_count,
          average_per_mp: total_expenses / toFloat(mp_count)
        }) AS parties
        WITH fy, quarter, parties, reduce(total = 0.0, p IN parties | total + p.total_expenses) AS total_all_parties
        RETURN {
          quarter: quarter,
          period: CASE WHEN $fiscalYear IS NULL THEN 'FY' + toString(fy) + '-Q' + toString(quarter) ELSE 'Q' + toString(quarter) END,
          parties: parties,
          total_all_parties: total_all_parties
        } AS trend
        ORDER BY CASE WHEN $fiscalYear IS NULL THEN fy ELSE 0 END, quarter
        """
        columnName: "trend"
      )

    # Global Expense Statistics
    # TODO: Implement as custom resolver (currently disabled due to type validation issue)
    # globalExpenseStats: GlobalExpenseStats!
    #   @cypher(
    #     statement: """
    #     MATCH (mp:MP)-[:INCURRED]->(e:Expense)
    #     WITH e.fiscal_year AS fiscal_year, e.quarter AS quarter, mp.id AS mp_id, sum(e.amount) AS quarter_total
    #     WITH collect(quarter_total) AS all_quarter_totals
    #     RETURN {
    #       average_per_quarter: reduce(sum = 0.0, x IN all_quarter_totals | sum + x) / size(all_quarter_totals),
    #       median_per_quarter: all_quarter_totals[size(all_quarter_totals) / 2],
    #       total_quarters: size(all_quarter_totals)
    #     } AS stats
    #     """
    #     columnName: "stats"
    #   )

    # Bill Lobbying Activity
    billLobbying(billNumber: String!, session: String!): BillLobbyingActivity
      @cypher(
        statement: """
        MATCH (bill:Bill {number: $billNumber, session: $session})
        OPTIONAL MATCH (org:Organization)-[l:LOBBIED_ON]->(bill)
        WHERE org IS NOT NULL
        WITH bill, org, count(l) as lobbying_count
        WITH bill,
             count(DISTINCT org) as organizations_lobbying,
             sum(lobbying_count) as total_lobbying_events,
             collect(DISTINCT {name: org.name, industry: org.industry, lobbying_count: lobbying_count}) as organizations
        WHERE size(organizations) > 0 OR organizations_lobbying = 0
        RETURN {
          bill: {
            number: bill.number,
            session: bill.session,
            title: bill.title,
            summary: bill.summary,
            status: bill.status,
            stage: bill.stage,
            updated_at: bill.updated_at
          },
          organizations_lobbying: COALESCE(organizations_lobbying, 0),
          total_lobbying_events: COALESCE(total_lobbying_events, 0),
          organizations: CASE WHEN organizations_lobbying > 0 THEN organizations ELSE [] END
        } AS activity
        """
        columnName: "activity"
      )

    # Detect Conflicts of Interest
    conflictsOfInterest(limit: Int = 20): [ConflictOfInterest!]!
      @cypher(
        statement: """
        MATCH (org:Organization)-[:LOBBIED_ON]->(bill:Bill)
        MATCH (org)-[:DONATED]->(party:Party)
        MATCH (party)<-[:MEMBER_OF]-(mp:MP)-[v:VOTED]->(vote:Vote)-[:SUBJECT_OF]->(bill)
        WHERE v.position = 'yea'
          AND exists((org)-[:RECEIVED]->(:Contract))
        WITH mp, org, bill, count(*) AS suspicion_score
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
          organization: {
            id: org.id,
            name: org.name,
            industry: org.industry,
            ceo: org.ceo
          },
          bill: {
            number: bill.number,
            session: bill.session,
            title: bill.title,
            summary: bill.summary,
            status: bill.status,
            stage: bill.stage,
            updated_at: bill.updated_at
          },
          suspicion_score: suspicion_score
        } AS conflict
        ORDER BY suspicion_score DESC
        LIMIT $limit
        """
        columnName: "conflict"
      )

    # MP News Articles
    # Note: This is implemented as a custom resolver in server.ts
    mpNews(mpName: String!, limit: Int = 10): [NewsArticle!]!

    # ============================================
    # Hansard Queries
    # ============================================

    # Get recent speeches by an MP
    mpSpeeches(
      mpId: ID!
      limit: Int = 20
      documentType: String  # Filter by "D" (Debates) or "E" (Evidence/Committee)
    ): [Statement!]!
      @cypher(
        statement: """
        MATCH (mp:MP {id: $mpId})<-[:MADE_BY]-(s:Statement)
        WHERE $documentType IS NULL OR
              exists((s)-[:PART_OF]->(:Document {document_type: $documentType}))
        WITH s
        ORDER BY s.time DESC
        LIMIT $limit
        RETURN s
        """
        columnName: "s"
      )

    # Get debate statements for a specific bill
    billDebates(
      billNumber: String!
      session: String!
      limit: Int = 50
      debateStage: String  # Filter by reading stage: "1", "2", or "3"
    ): [Statement!]!
      @cypher(
        statement: """
        MATCH (b:Bill {number: $billNumber, session: $session})<-[r:MENTIONS]-(s:Statement)
        WHERE $debateStage IS NULL OR r.debate_stage = $debateStage
        WITH s, r
        ORDER BY s.time ASC
        LIMIT $limit
        RETURN s
        """
        columnName: "s"
      )

    # Full-text search across Hansard content
    searchHansard(
      query: String!
      limit: Int = 50
      language: String = "en"  # "en" or "fr"
    ): [Statement!]!
      @cypher(
        statement: """
        CALL {
          WITH $query AS query, $language AS language
          CALL db.index.fulltext.queryNodes(
            CASE WHEN language = 'fr' THEN 'statement_content_fr' ELSE 'statement_content_en' END,
            query
          ) YIELD node, score
          RETURN node, score
        }
        WITH node AS s, score
        ORDER BY score DESC, s.time DESC
        LIMIT $limit
        RETURN s
        """
        columnName: "s"
      )

    # Get a specific Hansard document with all its statements
    hansardDocument(id: ID!): Document
      @cypher(
        statement: """
        MATCH (d:Document {id: $id})
        RETURN d
        """
        columnName: "d"
      )

    # ============================================
    # Committee Queries
    # ============================================

    # Get recent testimony/evidence for a committee
    committeeTestimony(committeeCode: String!, limit: Int = 20): [Statement!]!
      @cypher(
        statement: """
        MATCH (c:Committee {code: $committeeCode})<-[:SERVES_ON]-(mp:MP)<-[:MADE_BY]-(s:Statement)-[:PART_OF]->(d:Document {document_type: 'E'})
        WITH s, d
        ORDER BY s.time DESC
        LIMIT $limit
        RETURN s
        """
        columnName: "s"
      )

    # Committee activity metrics
    committeeActivityMetrics(committeeCode: String!): CommitteeActivityMetrics
      @cypher(
        statement: """
        MATCH (c:Committee {code: $committeeCode})
        RETURN {
          committee: c,
          total_meetings: 0,
          meetings_last_30_days: 0,
          meetings_last_90_days: 0,
          total_evidence_documents: 0,
          active_bills_count: 0,
          member_count: size((c)<-[:SERVES_ON]-()),
          avg_statements_per_meeting: 0.0
        }
        """
        columnName: "committeeActivityMetrics"
      )
  }
`;
