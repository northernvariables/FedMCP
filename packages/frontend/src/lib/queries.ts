/**
 * GraphQL queries and fragments
 */

import { gql } from '@apollo/client';

// ============================================
// Fragments
// ============================================

export const MP_BASIC_FRAGMENT = gql`
  fragment MPBasic on MP {
    id
    name
    party
    riding
    current
    cabinet_position
  }
`;

export const MP_SEATING_FRAGMENT = gql`
  fragment MPSeating on MP {
    id
    name
    party
    riding
    current
    cabinet_position
    parl_mp_id
    seat_row
    seat_column
    bench_section
    seat_visual_x
    seat_visual_y
  }
`;

export const MP_FULL_FRAGMENT = gql`
  fragment MPFull on MP {
    ...MPBasic
    gender
    elected_date
    email
    phone
    twitter
    wikipedia_id
    constituency_office
    ourcommons_url
    memberOf {
      code
      name
      seats
    }
    represents {
      name
      province
    }
  }
  ${MP_BASIC_FRAGMENT}
`;

export const BILL_BASIC_FRAGMENT = gql`
  fragment BillBasic on Bill {
    number
    session
    title
    title_fr
    summary
    summary_fr
    status
    status_fr
    bill_type
    bill_type_fr
    is_government_bill
    originating_chamber
    originating_chamber_fr
    introduced_date
  }
`;

export const STATEMENT_FRAGMENT = gql`
  fragment StatementBasic on Statement {
    id
    time
    who_en
    who_fr
    content_en
    content_fr
    h1_en
    h1_fr
    h2_en
    h2_fr
    h3_en
    h3_fr
    statement_type
    wordcount
    procedural
    thread_id
    parent_statement_id
    sequence_in_thread
  }
`;

// ============================================
// MP Queries
// ============================================

export const GET_MPS = gql`
  query GetMPs($where: MPWhere, $options: MPOptions) {
    mps(where: $where, options: $options) {
      ...MPBasic
    }
  }
  ${MP_BASIC_FRAGMENT}
`;

export const SEARCH_MPS = gql`
  query SearchMPs($searchTerm: String, $party: String, $current: Boolean, $cabinetOnly: Boolean, $limit: Int) {
    searchMPs(searchTerm: $searchTerm, party: $party, current: $current, cabinetOnly: $cabinetOnly, limit: $limit) {
      ...MPBasic
    }
  }
  ${MP_BASIC_FRAGMENT}
`;

export const GET_CHAMBER_SEATING = gql`
  query GetChamberSeating {
    mps(where: { current: true, seat_row_NOT: null }) {
      ...MPSeating
    }
  }
  ${MP_SEATING_FRAGMENT}
`;

export const GET_MP = gql`
  query GetMP($id: ID!) {
    mps(where: { id: $id }) {
      ...MPFull
      sponsored(options: { limit: 100, sort: [{ introduced_date: DESC }] }) {
        ...BillBasic
      }
      expenses(options: { limit: 50, sort: [{ fiscal_year: DESC }, { quarter: DESC }] }) {
        id
        fiscal_year
        quarter
        amount
        category
        description
      }
      votedConnection(first: 20, sort: [{ node: { date: DESC } }]) {
        edges {
          properties {
            position
          }
          node {
            id
            number
            date
            result
            yeas
            nays
            description
            subjectOf {
              number
              title
              session
            }
          }
        }
      }
      servedOnConnection {
        edges {
          properties {
            role
          }
          node {
            code
            name
            mandate
            chamber
          }
        }
      }
    }
  }
  ${MP_FULL_FRAGMENT}
  ${BILL_BASIC_FRAGMENT}
`;

export const GET_MP_SCORECARD = gql`
  query GetMPScorecard($mpId: ID!) {
    mpScorecard(mpId: $mpId) {
      mp {
        ...MPBasic
      }
      bills_sponsored
      bills_passed
      votes_participated
      petitions_sponsored
      total_petition_signatures
      current_year_expenses
      lobbyist_meetings
      legislative_effectiveness
    }
  }
  ${MP_BASIC_FRAGMENT}
`;

// TODO: Re-enable when GlobalExpenseStats type is implemented in graph-api schema
// export const GET_GLOBAL_EXPENSE_STATS = gql`
//   query GetGlobalExpenseStats {
//     globalExpenseStats {
//       average_per_quarter
//       median_per_quarter
//       total_quarters
//     }
//   }
// `;

export const GET_MP_NEWS = gql`
  query GetMPNews($mpName: String!, $limit: Int = 10) {
    mpNews(mpName: $mpName, limit: $limit) {
      title
      url
      source
      published_date
      description
      image_url
    }
  }
`;

// ============================================
// Bill Queries
// ============================================

export const GET_BILLS = gql`
  query GetBills($where: BillWhere, $options: BillOptions) {
    bills(where: $where, options: $options) {
      ...BillBasic
      sponsor {
        id
        name
        party
      }
    }
  }
  ${BILL_BASIC_FRAGMENT}
`;

export const SEARCH_BILLS = gql`
  query SearchBills(
    $searchTerm: String
    $status: String
    $session: String
    $bill_type: String
    $is_government_bill: Boolean
    $originating_chamber: String
    $limit: Int
  ) {
    searchBills(
      searchTerm: $searchTerm
      status: $status
      session: $session
      bill_type: $bill_type
      is_government_bill: $is_government_bill
      originating_chamber: $originating_chamber
      limit: $limit
    ) {
      ...BillBasic
      sponsor {
        name
        party
      }
    }
  }
  ${BILL_BASIC_FRAGMENT}
`;

export const GET_BILL = gql`
  query GetBill($number: String!, $session: String!) {
    bills(where: { number: $number, session: $session }) {
      ...BillBasic
      summary
      summary_fr
      stage
      latest_event
      passed_date
      royal_assent_date
      # Reading stage dates
      passed_house_first_reading
      passed_house_second_reading
      passed_house_third_reading
      passed_senate_first_reading
      passed_senate_second_reading
      passed_senate_third_reading
      # Statute info
      statute_year
      statute_chapter
      # Committees
      referredTo {
        code
        name
      }
      sponsor {
        ...MPBasic
      }
      votes(options: { limit: 25, sort: [{ date: DESC }] }) {
        id
        date
        result
        description
        yeas
        nays
      }
    }
  }
  ${BILL_BASIC_FRAGMENT}
  ${MP_BASIC_FRAGMENT}
`;

export const GET_BILL_LOBBYING = gql`
  query GetBillLobbying($billNumber: String!, $session: String!) {
    billLobbying(billNumber: $billNumber, session: $session) {
      bill {
        number
        title
        status
      }
      organizations_lobbying
      total_lobbying_events
      organizations {
        name
        industry
        lobbying_count
      }
    }
  }
`;

// ============================================
// Dashboard Queries
// ============================================

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    mps(where: { current: true }) {
      id
    }
    bills(options: { limit: 1 }) {
      number
    }
  }
`;

export const GET_TOP_SPENDERS = gql`
  query GetTopSpenders($fiscalYear: Int, $limit: Int = 10) {
    topSpenders(fiscalYear: $fiscalYear, limit: $limit) {
      mp {
        ...MPBasic
      }
      total_expenses
    }
  }
  ${MP_BASIC_FRAGMENT}
`;

export const GET_CONFLICTS_OF_INTEREST = gql`
  query GetConflictsOfInterest($limit: Int = 20) {
    conflictsOfInterest(limit: $limit) {
      mp {
        id
        name
        party
      }
      organization {
        name
        industry
      }
      bill {
        number
        title
      }
      suspicion_score
    }
  }
`;

export const SEARCH_LOBBY_REGISTRATIONS = gql`
  query SearchLobbyRegistrations($searchTerm: String, $active: Boolean, $limit: Int) {
    searchLobbyRegistrations(searchTerm: $searchTerm, active: $active, limit: $limit) {
      id
      reg_number
      client_org_name
      registrant_name
      effective_date
      active
      subject_matters
    }
  }
`;

export const GET_PARTY_SPENDING_TRENDS = gql`
  query GetPartySpendingTrends($fiscalYear: Int) {
    partySpendingTrends(fiscalYear: $fiscalYear) {
      quarter
      period
      parties {
        party
        total_expenses
        mp_count
        average_per_mp
      }
      total_all_parties
    }
  }
`;

// ============================================
// Committee Queries
// ============================================

export const GET_COMMITTEES = gql`
  query GetCommittees {
    committees {
      code
      name
      mandate
      chamber
      membersAggregate {
        count
      }
    }
  }
`;

export const GET_COMMITTEE = gql`
  query GetCommittee($code: ID!) {
    committees(where: { code: $code }) {
      code
      name
      mandate
      chamber
      members {
        id
        name
        party
        riding
        cabinet_position
        servedOnConnection(where: { node: { code: $code } }) {
          edges {
            properties {
              role
            }
          }
        }
      }
      bills {
        number
        title
        status
        session
      }
      meetings(options: { limit: 5, sort: [{ date: DESC }] }) {
        date
        number
        has_evidence
      }
    }
  }
`;

export const GET_COMMITTEE_MEETINGS = gql`
  query GetCommitteeMeetings($code: ID!) {
    committees(where: { code: $code }) {
      meetings(options: { limit: 50, sort: [{ date: DESC }] }) {
        id
        date
        number
        in_camera
        has_evidence
        meeting_url
        session
        parliament
      }
    }
  }
`;

export const GET_COMMITTEE_TESTIMONY = gql`
  query GetCommitteeTestimony($committeeCode: String!, $limit: Int = 20) {
    committeeTestimony(committeeCode: $committeeCode, limit: $limit) {
      ...StatementBasic
      madeBy {
        id
        name
        party
      }
      partOf {
        id
        date
        document_type
        session_id
      }
    }
  }
  ${STATEMENT_FRAGMENT}
`;

export const GET_COMMITTEE_ACTIVITY_METRICS = gql`
  query GetCommitteeActivityMetrics($committeeCode: String!) {
    committeeActivityMetrics(committeeCode: $committeeCode) {
      committee {
        code
        name
      }
      total_meetings
      meetings_last_30_days
      meetings_last_90_days
      total_evidence_documents
      active_bills_count
      member_count
      avg_statements_per_meeting
    }
  }
`;

// ============================================
// Hansard Queries
// ============================================

export const GET_MP_SPEECHES = gql`
  query GetMPSpeeches($mpId: ID!, $limit: Int = 20, $documentType: String) {
    mpSpeeches(mpId: $mpId, limit: $limit, documentType: $documentType) {
      ...StatementBasic
      partOf {
        id
        date
        document_type
        session_id
      }
    }
  }
  ${STATEMENT_FRAGMENT}
`;

export const GET_BILL_DEBATES = gql`
  query GetBillDebates($billNumber: String!, $session: String!, $limit: Int = 50, $debateStage: String) {
    billDebates(billNumber: $billNumber, session: $session, limit: $limit, debateStage: $debateStage) {
      ...StatementBasic
      madeBy {
        id
        name
        party
      }
      mentionsConnection {
        edges {
          properties {
            debate_stage
          }
        }
      }
    }
  }
  ${STATEMENT_FRAGMENT}
`;

export const SEARCH_HANSARD = gql`
  query SearchHansard($query: String!, $limit: Int = 50, $language: String = "en") {
    searchHansard(query: $query, limit: $limit, language: $language) {
      ...StatementBasic
      madeBy {
        id
        name
        party
      }
      partOf {
        id
        date
        document_type
        session_id
        presentedTo {
          code
          name
          chamber
        }
      }
    }
  }
  ${STATEMENT_FRAGMENT}
`;

export const GET_HANSARD_DOCUMENT = gql`
  query GetHansardDocument {
    documents(options: { limit: 100, sort: [{ date: DESC }] }) {
      id
      date
      number
      session_id
      document_type
      xml_source_url
      statements {
        ...StatementBasic
        madeBy {
          id
          name
          party
          }
      }
    }
  }
  ${STATEMENT_FRAGMENT}
`;

export const GET_RECENT_DEBATES = gql`
  query GetRecentDebates($limit: Int = 20) {
    documents(
      where: { document_type: "D" }
      options: { limit: $limit, sort: [{ date: DESC }] }
    ) {
      id
      date
      number
      session_id
      document_type
      statementsAggregate {
        count
      }
    }
  }
`;
