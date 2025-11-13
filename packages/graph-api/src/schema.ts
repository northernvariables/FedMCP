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

    # Photo URLs - Two-tier approach for graceful fallback
    photo_url_source: String  # OpenParliament URL (auto-updated by ingestion)
    photo_url: String  # Custom high-res GCS URL (manually upgraded, takes precedence)

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
    parent_statement_id: Int  # ID of statement this replies to
    sequence_in_thread: Int  # Order within conversation (0 = root)

    # Government response (for written questions)
    # Finds the matching government response by looking for a Statement with:
    # - Same h3_en (question number)
    # - Same document_id (same Hansard sitting)
    # - Liberal party member (government response) - must end with 'Lib.)'
    # Returns all answer fields in a single query (more efficient than 6 separate queries)
    answer: WrittenQuestionAnswer
      @cypher(
        statement: """
        OPTIONAL MATCH (a:Statement)
        WHERE a.h3_en = this.h3_en
          AND a.document_id = this.document_id
          AND a.who_en ENDS WITH 'Lib.)'
        WITH a
        LIMIT 1
        RETURN {
          id: toString(a.id),
          time: a.time,
          who_en: a.who_en,
          who_fr: a.who_fr,
          content_en: a.content_en,
          content_fr: a.content_fr
        } AS result
        """
        columnName: "result"
      )

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

  # ============================================
  # Debate Browse/Detail Types
  # ============================================

  type DebateSummary {
    document: DocumentSummary!
    statement_count: Int!
    speaker_count: Int!
    top_topics: [String!]!
    is_question_period: Boolean
  }

  type DocumentSummary {
    id: ID!
    date: Date
    session_id: String
    document_type: String
    number: Int
  }

  type DebateCalendarDay {
    date: String!
    hasHouseDebates: Boolean!
    hasQuestionPeriod: Boolean!
    hasCommittee: Boolean!
    hasScheduledMeeting: Boolean!
    scheduledMeetings: [ScheduledMeetingInfo!]!
  }

  type ScheduledMeetingInfo {
    committee_code: String!
    committee_name: String!
    number: Int!
    in_camera: Boolean!
  }

  type DebateDetail {
    document: DocumentInfo!
    statements: [StatementInfo!]!
    sections: [String!]!
    statement_count: Int!
  }

  type DocumentInfo {
    id: ID!
    date: Date
    session_id: String
    document_type: String
    number: Int
    xml_source_url: String
  }

  type MPInfo {
    id: ID!
    name: String
    party: String
    riding: String
    photo_url: String
    photo_url_source: String
  }

  # Written question with answer (for government MP pages)
  type WrittenQuestionWithAnswer {
    question: StatementInfo!
    answer: WrittenQuestionAnswer!
    partOf: DocumentInfo!
  }

  type StatementInfo {
    id: ID!
    time: DateTime
    who_en: String
    who_fr: String
    content_en: String
    content_fr: String
    h1_en: String
    h1_fr: String
    h2_en: String
    h2_fr: String
    h3_en: String
    h3_fr: String
    statement_type: String
    politician_id: Int
    thread_id: String
    parent_statement_id: Int
    sequence_in_thread: Int
    wordcount: Int
    procedural: Boolean
    madeBy: MPInfo
    partOf: DocumentInfo
  }

  type WrittenQuestionAnswer {
    id: String
    time: DateTime
    who_en: String
    who_fr: String
    content_en: String
    content_fr: String
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

    # Relationships
    organization: Organization @relationship(type: "COMMUNICATION_BY", direction: OUT)
    lobbyist: Lobbyist @relationship(type: "CONDUCTED_BY", direction: OUT)
    contacted: [MP!]! @relationship(type: "CONTACTED", direction: OUT)
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
    first_contact: Date!
    last_contact: Date
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

  # MP Summary for Scorecard (plain object, not a Node)
  type MPSummary {
    id: ID!
    name: String!
    given_name: String
    family_name: String
    party: String
    riding: String
    current: Boolean!
    cabinet_position: String
    email: String
    phone: String
    updated_at: DateTime!
  }

  type MPScorecard {
    mp: MP!
    bills_sponsored: Int!
    bills_passed: Int!
    votes_participated: Int!
    petitions_sponsored: Int!
    total_petition_signatures: Int!
    current_year_expenses: Float!
    lobbyist_meetings: Int!
    question_period_interjections: Int!
    voting_participation_rate: Float!
    party_discipline_score: Float!
    legislative_success_rate: Float!
    committee_activity_index: Float!
  }

  type MPAverages {
    party_code: String!
    party_name: String!
    avg_voting_participation_rate: Float
    avg_party_discipline_score: Float
    avg_legislative_success_rate: Float
    avg_committee_activity_index: Float
    avg_bills_sponsored: Float
    avg_bills_passed: Float
    avg_current_year_expenses: Float
    mp_count: Int!
  }

  type MPExpenseSummary {
    mp: MP!
    total_expenses: Float!
  }

  # TODO: Fix MPInterjectionStats validation error
  # type MPInterjectionStats {
  #   mp: MP!
  #   interjection_count: Int!
  # }

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
    last_updated: String!
  }


  # ============================================
  # Custom Queries (Accountability Analytics)
  # ============================================

  type Query {
    # MP Performance Scorecard
    # Test query to debug MPScorecard issues
    testMPScorecard(mpId: ID!): MP
      @cypher(
        statement: """
        MATCH (mp:MP {id: $mpId})
        RETURN mp
        """
        columnName: "mp"
      )

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
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)<-[:MADE_BY]-(statement:Statement {statement_type: 'interjection'})
          WHERE statement.h1_en CONTAINS 'Oral Question'
          RETURN count(DISTINCT statement) AS question_period_interjections
        }

        // Calculate voting participation rate (% of all votes participated in)
        CALL {
          WITH votes_participated
          MATCH (v:Vote)
          WITH votes_participated, count(DISTINCT v) AS total_votes
          RETURN CASE WHEN total_votes > 0
                 THEN (toFloat(votes_participated) / toFloat(total_votes)) * 100.0
                 ELSE 0.0 END AS voting_participation_rate
        }

        // Calculate party discipline score (% of votes aligned with party majority)
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[voted:VOTED]->(vote:Vote)
          WITH mp, voted, vote
          OPTIONAL MATCH (vote)<-[party_votes:VOTED]-(party_mp:MP)
          WHERE party_mp.party = mp.party
          WITH mp, vote, voted,
               count(DISTINCT CASE WHEN party_votes.position = voted.position THEN party_mp END) AS same_position_count,
               count(DISTINCT party_mp) AS total_party_votes
          WITH mp,
               count(DISTINCT vote) AS total_mp_votes,
               count(DISTINCT CASE WHEN toFloat(same_position_count) / toFloat(total_party_votes) > 0.5 THEN vote END) AS aligned_votes
          RETURN CASE WHEN total_mp_votes > 0
                 THEN (toFloat(aligned_votes) / toFloat(total_mp_votes)) * 100.0
                 ELSE 0.0 END AS party_discipline_score
        }

        // Calculate legislative success rate (% of bills that passed)
        CALL {
          WITH bills_sponsored, bills_passed
          RETURN CASE WHEN bills_sponsored > 0
                 THEN (toFloat(bills_passed) / toFloat(bills_sponsored)) * 100.0
                 ELSE 0.0 END AS legislative_success_rate
        }

        // Calculate committee activity index (weighted score)
        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[:SERVES_ON]->(committee:Committee)
          OPTIONAL MATCH (mp)<-[:MADE_BY]-(s:Statement)-[:PART_OF]->(d:Document {document_type: 'E'})
          WITH mp, count(DISTINCT committee) AS committee_memberships, count(DISTINCT s) AS committee_statements
          // Weight: 1 point per membership + 0.1 points per statement
          RETURN (toFloat(committee_memberships) + toFloat(committee_statements) * 0.1) AS committee_activity_index
        }

        // Collect all variables for final return
        WITH mp,
             bills_sponsored,
             bills_passed,
             votes_participated,
             petitions_sponsored,
             total_petition_signatures,
             current_year_expenses,
             lobbyist_meetings,
             question_period_interjections,
             voting_participation_rate,
             party_discipline_score,
             legislative_success_rate,
             committee_activity_index

        // Return scorecard with explicitly projected MP fields
        RETURN {
          mp: {
            id: mp.id,
            name: mp.name,
            given_name: mp.given_name,
            family_name: mp.family_name,
            party: mp.party,
            riding: mp.riding,
            current: mp.current,
            cabinet_position: mp.cabinet_position,
            email: mp.email,
            phone: mp.phone,
            updated_at: mp.updated_at
          },
          bills_sponsored: bills_sponsored,
          bills_passed: bills_passed,
          votes_participated: votes_participated,
          petitions_sponsored: petitions_sponsored,
          total_petition_signatures: COALESCE(total_petition_signatures, 0),
          current_year_expenses: COALESCE(current_year_expenses, 0.0),
          lobbyist_meetings: lobbyist_meetings,
          question_period_interjections: question_period_interjections,
          voting_participation_rate: voting_participation_rate,
          party_discipline_score: party_discipline_score,
          legislative_success_rate: legislative_success_rate,
          committee_activity_index: committee_activity_index
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

    # Server-side randomized MPs with optional party filtering
    randomMPs(
      parties: [String!]
      limit: Int = 8
    ): [MP!]!
      @cypher(
        statement: """
        MATCH (mp:MP)
        WHERE mp.current = true
          AND ($parties IS NULL OR size($parties) = 0 OR mp.party IN $parties)
        WITH mp, rand() AS r
        ORDER BY r
        LIMIT $limit
        RETURN mp
        """
        columnName: "mp"
      )

    # TODO: Re-enable mpInterjectionLeaderboard after fixing MPInterjectionStats validation
    # MPs ranked by Question Period interjections
    # mpInterjectionLeaderboard(
    #   party: String
    #   limit: Int = 100
    # ): [MPInterjectionStats!]!
    #   @cypher(
    #     statement: """
    #     MATCH (mp:MP)
    #     WHERE mp.current = true
    #       AND ($party IS NULL OR mp.party = $party)
    #     OPTIONAL MATCH (mp)<-[:MADE_BY]-(statement:Statement {statement_type: 'interjection'})
    #     WHERE statement.h1_en CONTAINS 'Oral Question'
    #     WITH mp, count(DISTINCT statement) AS interjection_count
    #     RETURN {
    #       mp: mp,
    #       interjection_count: interjection_count
    #     } AS result
    #     ORDER BY interjection_count DESC, mp.name ASC
    #     LIMIT $limit
    #     """
    #     columnName: "result"
    #   )

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
    # Custom resolver in server.ts handles this query with proper integer conversion
    topSpenders(fiscalYear: Int, limit: Int = 10): [MPExpenseSummary!]!

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
          bill: bill,
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
          mp: mp,
          organization: org,
          bill: bill,
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
    # Optimized Lobbying Search Queries
    # ============================================

    # Full-text search for lobbyists (optimized)
    searchLobbyists(
      searchTerm: String!
      limit: Int = 20
    ): [Lobbyist!]!
      @cypher(
        statement: """
        CALL db.index.fulltext.queryNodes('lobbyist_search', $searchTerm)
        YIELD node, score
        WITH node AS lobbyist, score
        WHERE score > 0.5
        RETURN lobbyist
        ORDER BY score DESC
        LIMIT $limit
        """
        columnName: "lobbyist"
      )

    # Full-text search for organizations (optimized)
    searchOrganizations(
      searchTerm: String!
      limit: Int = 20
    ): [Organization!]!
      @cypher(
        statement: """
        CALL db.index.fulltext.queryNodes('organization_search', $searchTerm)
        YIELD node, score
        WITH node AS org, score
        WHERE score > 0.5
        RETURN org
        ORDER BY score DESC
        LIMIT $limit
        """
        columnName: "org"
      )

    # Full-text search for bills (optimized)
    searchBillsFullText(
      searchTerm: String!
      status: String
      session: String
      limit: Int = 50
    ): [Bill!]!
      @cypher(
        statement: """
        CALL db.index.fulltext.queryNodes('bill_search', $searchTerm)
        YIELD node, score
        WITH node AS bill, score
        WHERE score > 0.5
          AND ($status IS NULL OR bill.status = $status)
          AND ($session IS NULL OR bill.session = $session)
        RETURN bill
        ORDER BY score DESC, bill.introduced_date DESC
        LIMIT $limit
        """
        columnName: "bill"
      )

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

    # Get written questions (Questions on the Order Paper)
    writtenQuestions(
      limit: Int = 50
      answered: Boolean  # Filter by whether question has an answer
      mpId: ID  # Filter by MP who asked
      session: String  # Filter by parliamentary session (e.g., "45-1")
    ): [Statement!]!
      @cypher(
        statement: """
        MATCH (s:Statement)-[:PART_OF]->(d:Document)
        WHERE s.h2_en CONTAINS 'Questions on the Order Paper'
          AND s.h3_en IS NOT NULL
          AND s.h3_en <> ''
          AND s.h3_en CONTAINS 'Question No'
          AND NOT s.who_en CONTAINS 'Lib.'
          AND s.who_en IS NOT NULL
          AND s.who_en <> ''
          AND ($mpId IS NULL OR EXISTS((s)<-[:MADE_BY]-(:MP {id: $mpId})))
          AND ($session IS NULL OR d.session_id = $session)

        # Filter by answered status if requested
        OPTIONAL MATCH (a:Statement)
        WHERE a.h3_en = s.h3_en
          AND a.document_id = s.document_id
          AND a.who_en CONTAINS 'Lib.'

        WITH s, a
        WHERE $answered IS NULL OR ($answered = true AND a IS NOT NULL) OR ($answered = false AND a IS NULL)

        WITH s
        ORDER BY s.time DESC
        LIMIT $limit

        RETURN s
        """
        columnName: "s"
      )

    # Get written questions asked by a specific MP
    # Optional session parameter filters to specific parliamentary session (e.g., "45-1")
    mpWrittenQuestions(
      mpId: ID!
      limit: Int = 50
      session: String
    ): [Statement!]!
      @cypher(
        statement: """
        MATCH (mp:MP {id: $mpId})<-[:MADE_BY]-(s:Statement)-[:PART_OF]->(d:Document)
        WHERE s.h2_en CONTAINS 'Questions on the Order Paper'
          AND s.h3_en IS NOT NULL
          AND s.h3_en <> ''
          AND s.h3_en CONTAINS 'Question No'
          AND ($session IS NULL OR d.session_id = $session)

        WITH s
        ORDER BY s.time DESC
        LIMIT $limit

        RETURN s
        """
        columnName: "s"
      )

    # Get list of parliamentary sessions that have written questions
    # Returns session IDs like "45-1", "44-1", etc. in descending order
    writtenQuestionSessions: [String!]!
      @cypher(
        statement: """
        MATCH (s:Statement)-[:PART_OF]->(d:Document)
        WHERE s.h2_en CONTAINS 'Questions on the Order Paper'
          AND s.h3_en CONTAINS 'Question No'
          AND d.session_id IS NOT NULL
        WITH DISTINCT d.session_id AS session_id
        ORDER BY session_id DESC
        RETURN session_id
        """
        columnName: "session_id"
      )

    # Get written questions answered by a government MP
    # Returns opposition questions with this MP's answers
    # For use on Liberal/government MP pages
    mpAnsweredQuestions(
      mpId: ID!
      limit: Int = 50
      session: String
    ): [WrittenQuestionWithAnswer!]!
      @cypher(
        statement: """
        MATCH (mp:MP {id: $mpId})

        // Find answers provided by this government MP
        MATCH (mp)<-[:MADE_BY]-(answer:Statement)-[:PART_OF]->(d:Document)
        WHERE answer.h2_en CONTAINS 'Questions on the Order Paper'
          AND answer.h3_en IS NOT NULL
          AND answer.h3_en <> ''
          AND answer.h3_en CONTAINS 'Question No'
          AND answer.who_en CONTAINS 'Lib.'
          AND ($session IS NULL OR d.session_id = $session)

        // Find the original opposition question for each answer
        MATCH (question:Statement)-[:PART_OF]->(d)
        WHERE question.h3_en = answer.h3_en
          AND NOT question.who_en CONTAINS 'Lib.'

        // Get the MP who made the question
        OPTIONAL MATCH (question)-[:MADE_BY]->(question_mp:MP)

        WITH question, answer, d, question_mp
        ORDER BY answer.time DESC
        LIMIT $limit

        RETURN {
          question: {
            id: toString(question.id),
            time: question.time,
            who_en: question.who_en,
            who_fr: question.who_fr,
            content_en: question.content_en,
            content_fr: question.content_fr,
            h1_en: question.h1_en,
            h1_fr: question.h1_fr,
            h2_en: question.h2_en,
            h2_fr: question.h2_fr,
            h3_en: question.h3_en,
            h3_fr: question.h3_fr,
            statement_type: question.statement_type,
            politician_id: question.politician_id,
            thread_id: question.thread_id,
            parent_statement_id: question.parent_statement_id,
            sequence_in_thread: question.sequence_in_thread,
            wordcount: question.wordcount,
            procedural: question.procedural,
            madeBy: CASE WHEN question_mp IS NOT NULL THEN {
              id: question_mp.id,
              name: question_mp.name,
              party: question_mp.party,
              riding: question_mp.riding,
              photo_url: question_mp.photo_url,
              photo_url_source: question_mp.photo_url_source
            } ELSE null END,
            partOf: {
              id: toString(d.id),
              date: d.date,
              session_id: d.session_id,
              document_type: d.document_type,
              number: d.number,
              xml_source_url: d.xml_source_url
            }
          },
          answer: {
            id: toString(answer.id),
            time: answer.time,
            who_en: answer.who_en,
            who_fr: answer.who_fr,
            content_en: answer.content_en,
            content_fr: answer.content_fr
          },
          partOf: {
            id: toString(d.id),
            date: d.date,
            session_id: d.session_id,
            document_type: d.document_type,
            number: d.number,
            xml_source_url: d.xml_source_url
          }
        } AS result
        """
        columnName: "result"
      )

    # Search written questions by keyword
    searchWrittenQuestions(
      searchTerm: String!
      limit: Int = 50
      language: String = "en"
    ): [Statement!]!
      @cypher(
        statement: """
        CALL {
          WITH $searchTerm AS query, $language AS language
          CALL db.index.fulltext.queryNodes(
            CASE WHEN language = 'fr' THEN 'statement_content_fr' ELSE 'statement_content_en' END,
            query
          ) YIELD node, score
          RETURN node, score
        }
        WITH node AS s, score
        WHERE s.h2_en CONTAINS 'Questions on the Order Paper'
          AND s.h3_en IS NOT NULL
          AND s.h3_en <> ''
          AND s.h3_en CONTAINS 'Question No'
          AND NOT s.who_en CONTAINS 'Lib.'
          AND s.who_en IS NOT NULL
          AND s.who_en <> ''

        WITH s, score
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

    # List recent debates (browse view)
    recentDebates(
      limit: Int = 20
      documentType: String  # "D" (Debates) or "E" (Evidence)
      questionPeriodOnly: Boolean = false
      startDate: String  # Filter by date range (YYYY-MM-DD)
      endDate: String    # Filter by date range (YYYY-MM-DD)
    ): [DebateSummary!]!
      @cypher(
        statement: """
        MATCH (d:Document)
        WHERE d.public = true
          AND ($documentType IS NULL OR d.document_type = $documentType)
          AND ($startDate IS NULL OR d.date >= $startDate)
          AND ($endDate IS NULL OR d.date <= $endDate)
        OPTIONAL MATCH (d)<-[:PART_OF]-(s:Statement)
        WITH d, s
        WHERE NOT $questionPeriodOnly OR s.h1_en CONTAINS 'Oral Question' OR s.h1_en CONTAINS 'Question Period'
        WITH d,
             count(DISTINCT s) AS statement_count,
             count(DISTINCT s.politician_id) AS speaker_count,
             collect(DISTINCT s.h2_en)[0..3] AS top_topics
        WHERE statement_count > 0
        RETURN {
          document: {
            id: d.id,
            date: d.date,
            session_id: d.session_id,
            document_type: d.document_type,
            number: d.number
          },
          statement_count: statement_count,
          speaker_count: speaker_count,
          top_topics: [topic IN top_topics WHERE topic IS NOT NULL]
        } AS summary
        ORDER BY d.date DESC
        LIMIT $limit
        """
        columnName: "summary"
      )

    # Get full debate with all statements (for debate detail page)
    debateWithStatements(
      documentId: ID!
      includeThreading: Boolean = true
    ): DebateDetail
      @cypher(
        statement: """
        MATCH (d:Document {id: toInteger($documentId)})
        MATCH (d)<-[:PART_OF]-(s:Statement)
        WITH d, s
        ORDER BY s.time ASC
        OPTIONAL MATCH (s)-[:MADE_BY]->(mp:MP)
        WITH d,
             collect({
               id: s.id,
               time: s.time,
               who_en: s.who_en,
               who_fr: s.who_fr,
               content_en: s.content_en,
               content_fr: s.content_fr,
               h1_en: s.h1_en,
               h2_en: s.h2_en,
               h3_en: s.h3_en,
               statement_type: s.statement_type,
               politician_id: s.politician_id,
               thread_id: s.thread_id,
               parent_statement_id: s.parent_statement_id,
               sequence_in_thread: s.sequence_in_thread,
               wordcount: s.wordcount,
               procedural: s.procedural,
               madeBy: CASE WHEN mp IS NOT NULL THEN {
                 id: mp.id,
                 name: mp.name,
                 party: mp.party,
                 photo_url: mp.photo_url,
                photo_url_source: mp.photo_url_source
               } ELSE null END,
               partOf: {
                 id: d.id,
                 date: d.date,
                 document_type: d.document_type
               }
             }) AS statements,
             count(DISTINCT s.h1_en) AS section_count,
             collect(DISTINCT s.h1_en) AS sections
        RETURN {
          document: {
            id: d.id,
            date: d.date,
            session_id: d.session_id,
            document_type: d.document_type,
            number: d.number,
            xml_source_url: d.xml_source_url
          },
          statements: statements,
          sections: [section IN sections WHERE section IS NOT NULL],
          statement_count: size(statements)
        } AS detail
        """
        columnName: "detail"
      )

    # Get calendar data for debates (for calendar view)
    # Custom resolver in server.ts that merges Neo4j data with OpenParliament scheduled meetings
    debatesCalendarData(
      startDate: String!
      endDate: String!
    ): [DebateCalendarDay!]!

    # Question Period debates only
    questionPeriodDebates(
      limit: Int = 10
      sinceDate: Date
    ): [DebateSummary!]!
      @cypher(
        statement: """
        MATCH (d:Document)<-[:PART_OF]-(s:Statement)
        WHERE d.public = true
          AND d.document_type = 'D'
          AND (s.h1_en CONTAINS 'Oral Question' OR s.h1_en CONTAINS 'Question Period')
          AND ($sinceDate IS NULL OR d.date >= date($sinceDate))
        WITH d,
             count(DISTINCT s) AS statement_count,
             count(DISTINCT s.politician_id) AS speaker_count,
             collect(DISTINCT s.h2_en)[0..5] AS top_topics
        RETURN {
          document: {
            id: d.id,
            date: d.date,
            session_id: d.session_id,
            document_type: d.document_type,
            number: d.number
          },
          statement_count: statement_count,
          speaker_count: speaker_count,
          top_topics: [topic IN top_topics WHERE topic IS NOT NULL],
          is_question_period: true
        } AS summary
        ORDER BY d.date DESC
        LIMIT $limit
        """
        columnName: "summary"
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

    # Party performance averages for comparison
    mpPartyAverages(partyCode: String!): MPAverages
      @cypher(
        statement: """
        MATCH (party:Party {code: $partyCode})<-[:MEMBER_OF]-(mp:MP)
        WHERE mp.current = true

        WITH party, mp,
          CASE
            WHEN date().month < 4 THEN date().year
            ELSE date().year + 1
          END AS current_fiscal_year

        // Calculate total votes in the system for participation rate
        CALL {
          MATCH (v:Vote)
          RETURN count(DISTINCT v) AS total_votes
        }

        // For each MP, calculate their metrics
        CALL {
          WITH mp, current_fiscal_year
          OPTIONAL MATCH (mp)-[:SPONSORED]->(bill:Bill)
          RETURN count(DISTINCT bill) AS mp_bills_sponsored,
                 count(DISTINCT CASE WHEN bill.status = 'Passed' THEN bill END) AS mp_bills_passed
        }

        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[voted:VOTED]->(vote:Vote)
          WITH mp, voted, vote, count(DISTINCT vote) AS mp_votes_participated
          // Calculate party alignment (votes where MP voted same as majority of their party)
          OPTIONAL MATCH (vote)<-[party_votes:VOTED]-(party_mp:MP)-[:MEMBER_OF]->(mp_party:Party)
          WHERE mp_party.code = mp.party
          WITH mp, vote, voted, mp_votes_participated,
               count(DISTINCT CASE WHEN party_votes.position = voted.position THEN party_mp END) AS same_position_count,
               count(DISTINCT party_mp) AS total_party_votes
          WITH mp, mp_votes_participated,
               count(DISTINCT CASE WHEN toFloat(same_position_count) / toFloat(total_party_votes) > 0.5 THEN vote END) AS aligned_votes
          RETURN mp_votes_participated, aligned_votes
        }

        CALL {
          WITH mp, current_fiscal_year
          OPTIONAL MATCH (mp)-[:INCURRED]->(expense:Expense {fiscal_year: current_fiscal_year})
          RETURN sum(expense.amount) AS mp_current_year_expenses
        }

        CALL {
          WITH mp
          OPTIONAL MATCH (mp)-[:SERVES_ON]->(committee:Committee)
          OPTIONAL MATCH (mp)<-[:MADE_BY]-(s:Statement)-[:PART_OF]->(d:Document {document_type: 'E'})
          WITH mp, count(DISTINCT committee) AS committee_memberships, count(DISTINCT s) AS committee_statements
          // Weight: 1 point per membership + 0.1 points per statement
          RETURN (committee_memberships + committee_statements * 0.1) AS mp_committee_activity
        }

        // Calculate averages across all party MPs
        WITH party, total_votes,
             avg(mp_bills_sponsored) AS avg_bills_sponsored,
             avg(mp_bills_passed) AS avg_bills_passed,
             avg(mp_current_year_expenses) AS avg_current_year_expenses,
             avg(CASE WHEN total_votes > 0
                  THEN (toFloat(mp_votes_participated) / toFloat(total_votes)) * 100.0
                  ELSE 0.0 END) AS avg_voting_participation_rate,
             avg(CASE WHEN mp_votes_participated > 0
                  THEN (toFloat(aligned_votes) / toFloat(mp_votes_participated)) * 100.0
                  ELSE 0.0 END) AS avg_party_discipline_score,
             avg(CASE WHEN mp_bills_sponsored > 0
                  THEN (toFloat(mp_bills_passed) / toFloat(mp_bills_sponsored)) * 100.0
                  ELSE 0.0 END) AS avg_legislative_success_rate,
             avg(mp_committee_activity) AS avg_committee_activity_index,
             count(DISTINCT mp) AS mp_count

        RETURN {
          party_code: party.code,
          party_name: party.name,
          avg_voting_participation_rate: avg_voting_participation_rate,
          avg_party_discipline_score: avg_party_discipline_score,
          avg_legislative_success_rate: avg_legislative_success_rate,
          avg_committee_activity_index: avg_committee_activity_index,
          avg_bills_sponsored: avg_bills_sponsored,
          avg_bills_passed: avg_bills_passed,
          avg_current_year_expenses: avg_current_year_expenses,
          mp_count: mp_count
        } AS averages
        """
        columnName: "averages"
      )
  }
`;
