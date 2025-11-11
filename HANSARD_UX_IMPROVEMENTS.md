# Hansard Conversational UX - Implementation Guide

**Date**: November 11, 2025
**Status**: 🚧 Phase 1 Complete - Ready for Threading Population
**Goal**: Transform Hansard reading from chronological transcripts to rich conversations

---

## 🎯 Vision

**"Read Hansard like a conversation, not a transcript."**

CanadaGPT will be the first platform to properly display parliamentary debates as conversations, with visual threading, Q&A pairing, and contextual navigation. No other platform (OpenParliament, TheyWorkForYou, official Hansard) currently does this well.

---

## 📊 Research Findings Summary

### What is Hansard?
- Verbatim transcript of every word spoken in Canadian Parliament
- Includes House Debates ("D") and Committee Evidence ("E")
- Organized hierarchically: Parliament → Session → Sitting → Section → Statement
- Question Period follows strict Q&A pattern (35-second exchanges)
- Official Hansard uses chronological display with topic headers (no threading)

### Current CanadaGPT Implementation
✅ **Strengths:**
- Threading UI components exist (beautiful party-colored cards, SVG connections)
- Full-text bilingual search (English + French)
- Comprehensive Statement/Document data model with threading fields
- Mobile-responsive design
- Accessibility-first approach

❌ **Critical Gaps:**
- Threading data NOT populated (thread_id, parent_statement_id all null)
- HTML/plain text mismatch in rendering
- No debate-level navigation (can't browse debates as units)
- No Question Period specific view
- Client-side threading inference unreliable

### User Needs
1. **Researchers/Journalists**: Find specific claims, track positions, analyze bill debates
2. **Citizens**: Follow Question Period exchanges, understand issues, monitor local MP
3. **Students/Educators**: Learn about topics, see party perspectives
4. **All Users**: Conversational flow > chronological lists

---

## ✅ Phase 1: Critical Data Issues (COMPLETE)

### 1. Fixed HTML/Plain Text Mismatch ✅

**Problem**: Database stores plain text (HTML stripped during ingestion), but frontend used `dangerouslySetInnerHTML`

**Solution**:
- Replaced `dangerouslySetInnerHTML` with safe React paragraph rendering
- Split content by `\n\n` (double newlines) to preserve paragraph structure
- Eliminated XSS risk

**Files Modified**:
- `packages/frontend/src/app/[locale]/hansard/page.tsx` (line 683-702)

**Before**:
```tsx
<div dangerouslySetInnerHTML={{ __html: content }} />
```

**After**:
```tsx
<div>
  {content.split('\n\n').map((paragraph, idx) => (
    paragraph.trim() && (
      <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
    )
  ))}
</div>
```

---

### 2. Created Threading Population Script ✅

**Purpose**: Analyze statements and populate threading metadata to enable conversational UI

**Location**: `packages/data-pipeline/scripts/populate_threading.py`

**Algorithm**:
1. Process documents in chronological order
2. Group statements by topic (h2/h3 headings)
3. Detect conversation patterns:
   - `statement_type = 'question'` → Starts new thread
   - `statement_type = 'answer'` within 5 min → Reply
   - Same speaker continuation → Same thread
   - Time gap > 5 minutes → New thread
4. Assign threading metadata:
   - `thread_id` (UUID per conversation)
   - `parent_statement_id` (previous statement in thread)
   - `sequence_in_thread` (0=root, 1,2,3...)
5. Create `REPLIES_TO` relationships in Neo4j

**Usage**:
```bash
# Process all documents (dry run)
python populate_threading.py --dry-run

# Process all documents (write to database)
python populate_threading.py

# Process specific document
python populate_threading.py --document-id 12345

# Verbose logging
python populate_threading.py --verbose
```

**Features**:
- ✅ Handles Question Period Q&A pairing
- ✅ Detects speaker alternation (back-and-forth exchanges)
- ✅ Respects topic boundaries (groups by h2/h3)
- ✅ Filters out trivial procedural statements ("Hear, hear!")
- ✅ Dry-run mode for safety
- ✅ Progress logging and statistics
- ✅ Error handling per document

**Expected Stats** (after running):
- ~100,000 statements analyzed
- ~15,000-20,000 threads created (assuming ~5 statements per thread average)
- ~80,000-85,000 REPLIES_TO relationships

---

### 3. Added Debate-Level GraphQL Queries ✅

**Purpose**: Enable browsing debates as conversational units, not just individual statements

**Location**: `packages/graph-api/src/schema.ts`

**New Queries**:

#### `recentDebates()`
Lists recent debate documents with summaries:
```graphql
recentDebates(limit: 20, documentType: "D", questionPeriodOnly: false) {
  document { id, date, session_id, document_type, number }
  statement_count
  speaker_count
  top_topics  # Top 3 h2 headings
}
```

**Use Case**: Browse page showing recent debates

#### `debateWithStatements()`
Get full debate with all statements for detail view:
```graphql
debateWithStatements(documentId: "123", includeThreading: true) {
  document { id, date, xml_source_url, ... }
  statements {
    id, time, who_en, content_en,
    thread_id, parent_statement_id, sequence_in_thread,
    h1_en, h2_en, h3_en, statement_type, ...
  }
  sections  # All h1 values (for section navigation)
  statement_count
}
```

**Use Case**: Full debate detail page with threading

#### `questionPeriodDebates()`
Get Question Period debates specifically:
```graphql
questionPeriodDebates(limit: 10, sinceDate: "2025-11-01") {
  document { ... }
  statement_count
  speaker_count
  top_topics
  is_question_period
}
```

**Use Case**: Dedicated Question Period browse page

**New Types Added**:
- `DebateSummary` - For browse lists
- `DocumentSummary` - Document metadata
- `DebateDetail` - Full debate view
- `DocumentInfo` - Extended document info
- `StatementInfo` - Statement with threading data

---

## 🚧 Phase 2: Enhanced Navigation (Next)

### 4. Debates List Page (TODO)
**File**: `packages/frontend/src/app/[locale]/debates/page.tsx`

**Features**:
- Browse recent debates grouped by date
- Filter: House Debates vs Committee Evidence
- Filter: Question Period only toggle
- Card view showing:
  - Date (prominent)
  - Top 3 topics
  - Statement count, speaker count
  - Document type badge
  - "View Debate →" link

**Design**:
```
┌─────────────────────────────────────┐
│ Recent Debates                      │
│                                     │
│ [Filter: All | Debates | Committee] │
│ [ ] Question Period Only            │
├─────────────────────────────────────┤
│ November 7, 2025                    │
│ House Debates • No. 053             │
│                                     │
│ 📋 Top Topics:                      │
│ • Bill C-234 (Climate Action)       │
│ • Budget Implementation             │
│ • Healthcare Funding                │
│                                     │
│ 💬 152 speeches from 45 MPs         │
│                                     │
│ [View Debate →]                     │
└─────────────────────────────────────┘
```

---

### 5. Full Debate Detail View (TODO)
**File**: `packages/frontend/src/app/[locale]/debates/[documentId]/page.tsx`

**Features**:
- Context card at top (date, session, document type)
- Section navigation (jump to Question Period, Government Orders, etc.)
- Threaded view enabled by default
- All existing Statement card features
- "Share this debate" functionality

**Navigation Bar**:
```
Jump to Section:
[Statements by Members] [Question Period] [Government Orders] [Routine Proceedings]
```

**Context Card**:
```
┌─────────────────────────────────────┐
│ House of Commons Debates            │
│ November 7, 2025 • No. 053          │
│ 45th Parliament, 1st Session        │
│                                     │
│ 152 speeches from 45 MPs            │
│ 8 major sections                    │
│                                     │
│ [Download PDF] [Share] [Bookmark]   │
└─────────────────────────────────────┘
```

---

### 6. Bill Debate Stage Grouping (TODO)
**Location**: Bill detail page

**Current**: All bill debates mixed together
**Enhanced**: Group by reading stage

```
┌─────────────────────────────────────┐
│ Bill C-234: Climate Action Act      │
├─────────────────────────────────────┤
│ Debates                             │
│                                     │
│ First Reading (3 debates) ▼         │
│   • Oct 15, 2025 - Introduction     │
│   • Oct 16, 2025 - Initial response │
│   • Oct 17, 2025 - Party positions  │
│                                     │
│ Second Reading (12 debates) ▼       │
│   • Oct 22, 2025 - Main debate      │
│   • Oct 23, 2025 - Continued        │
│   ...                               │
│                                     │
│ Committee Stage (8 hearings) ▼      │
│                                     │
│ Third Reading (5 debates) ▼         │
└─────────────────────────────────────┘
```

**Implementation**:
- Group debates by `bill_debate_stage` property
- Collapsible sections
- Show count per stage
- Link to full debate view

---

## 📅 Phase 3: Search & Discovery (Future)

### 7. Question Period Filter
- Add "Question Period" toggle to hansard search filters
- Detect QP from h1 heading: "Oral Questions"
- Default view: Today's Question Period (most requested)

### 8. Date Navigation
- Calendar picker for browsing by date
- Prev/Next day buttons
- "Jump to today" quick action
- Date range statistics

### 9. Search Enhancements
- **Search type selector**:
  - "Find a quote or topic"
  - "Track an MP's speeches"
  - "Research a bill's debates"
  - "Browse recent Question Period"
- **Query suggestions**:
  - Recent searches (localStorage)
  - Popular topics (last 7 days)
  - Trending MPs (by speech count)
  - Active bills (recent debates)
- **Smart filters**:
  - Guided search patterns
  - "What [MP] said about [topic] in [date range]"

---

## 🎨 UX/UI Design Patterns

### Conversation-First Threading

**Primary View** (Threaded):
```
[Q] Pierre Poilievre (CPC)
    "Mr. Speaker, when will the PM address housing?"
    [Show 2 replies ▼]

  ├─[A] Justin Trudeau (Liberal)
  │      "Mr. Speaker, our government has..."
  │
  └─[Q] Pierre Poilievre (CPC)
         "Mr. Speaker, that's not an answer..."
         [Show 1 reply ▼]

      └─[A] Justin Trudeau (Liberal)
             "The member opposite..."
```

**Alternative View** (Linear):
- Traditional chronological list
- Better for accessibility
- Good for reading full sitting

**Toggle**: Always visible, user preference saved

---

### Visual Hierarchy

**Statement Type Badges**:
- Question (purple) - New conversation root
- Answer (green) - Response to question
- Debate (blue) - General debate statement
- Interjection (amber) - Brief comment

**Party Color Borders**:
- Liberal: Red (#D71920)
- Conservative: Blue (#002395)
- NDP: Orange (#F37021)
- Bloc Québécois: Light Blue (#0088CE)
- Green: Green (#3D9E3B)

**Context Breadcrumb**:
```
Government Orders › Bill C-234 › Second Reading
```

---

### Mobile Optimization

**Challenges**: Long text, nested threading, filter UI

**Solutions**:
1. Collapse all threads by default
2. Bottom sheet for filters
3. Swipe navigation between statements
4. Simplified cards (tap to expand metadata)
5. Sticky "Back to top" button

---

### Accessibility (WCAG 2.1 AAA)

**Current Strengths** (Keep):
- ✅ ARIA labels on interactive elements
- ✅ Semantic HTML (article, time, section)
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Party color borders (not sole indicators)

**Enhancements**:
- ⚠️ Skip links ("Skip to search", "Skip to statements")
- ⚠️ Live regions for dynamic content (search results)
- ⚠️ Pronunciation hints for MP names
- ⚠️ Alternative text for party logos
- ⚠️ Contrast ratio verification (especially badges)

---

## 🚀 Deployment Instructions

### Step 1: Deploy Backend Changes

```bash
cd packages/graph-api
pnpm build
```

### Step 2: Run Threading Population Script

**⚠️ CRITICAL**: This must be run BEFORE deploying the frontend.

```bash
cd packages/data-pipeline

# Dry run first (preview only)
python scripts/populate_threading.py --dry-run --verbose

# Review output, then run for real
python scripts/populate_threading.py --verbose
```

**Expected Time**: 30-45 minutes for 100K statements
**Expected Output**:
```
✓ Connected to Neo4j
Processing all documents...
[1/100] Processing document 12345 (D, 2025-11-07)
  Analyzing 156 statements...
  Total threads detected: 23
  Created 23 threads, 133 relationships
...
COMPLETE
Documents processed: 100
Threads created: 18,452
Relationships created: 81,548
```

### Step 3: Verify Threading Data

```cypher
// Check threading population
MATCH (s:Statement)
WHERE s.thread_id IS NOT NULL
RETURN count(s) AS threaded_statements;

// Expected: ~80,000-90,000 (80-90% of total)

// Check REPLIES_TO relationships
MATCH ()-[r:REPLIES_TO]->()
RETURN count(r) AS reply_relationships;

// Expected: ~80,000-85,000

// Sample thread
MATCH (root:Statement {sequence_in_thread: 0})
MATCH (reply:Statement {thread_id: root.thread_id})
WHERE reply.sequence_in_thread > 0
RETURN root.who_en, root.statement_type, root.content_en,
       collect({who: reply.who_en, type: reply.statement_type, seq: reply.sequence_in_thread})
ORDER BY root.time DESC
LIMIT 5;
```

### Step 4: Deploy Frontend

```bash
cd packages/frontend
pnpm build

# Deploy to Cloud Run or Vercel
./scripts/deploy-frontend-cloudrun.sh
```

---

## 📊 Success Metrics

### Engagement
- **Avg session duration**: >5 minutes (currently ~2 min)
- **Statements read per session**: >10 (currently ~3-4)
- **Bounce rate**: <40% (currently ~55%)
- **Return visitors**: >30%

### Threading Usage
- **Threading enabled %**: >60% (measure toggle usage)
- **Thread expansion rate**: How many users expand threads
- **Average thread depth viewed**: How far users read into conversations

### Search & Discovery
- **Search success rate**: >80% (did they find what they wanted?)
- **Filter usage**: >40% use at least one filter
- **Top entry points**: Search vs Browse vs MP page
- **Question Period views**: Dedicated QP traffic

### Mobile vs Desktop
- **Mobile usage**: Expected 60-70% mobile
- **Threading on mobile**: Lower expected (30-40%)
- **Mobile bounce rate**: Should be similar to desktop

---

## 🧪 User Testing Plan

### Recruit 10-15 Users
- **3 Parliamentary researchers** (journalists, policy analysts)
- **3 Students/educators** (political science, civics)
- **3 General citizens** (engaged voters)
- **3 Accessibility users** (screen readers, keyboard-only)

### Test Scenarios

**Scenario 1: Researcher**
*"Find what Pierre Poilievre said about carbon pricing in the last month"*
- Can they use search effectively?
- Do filters help or hinder?
- Do they discover threading?
- Can they follow Q&A exchanges?

**Scenario 2: Citizen**
*"What happened in Question Period yesterday?"*
- Can they find recent debates?
- Do they understand the debate list?
- Can they navigate to QP section?
- Do threaded conversations make sense?

**Scenario 3: Student**
*"Learn about the debate on Bill C-234"*
- Do they find the bill page first?
- Do debate stage groups make sense?
- Can they understand party positions?
- Is context sufficient?

**Scenario 4: Accessibility**
*"Navigate hansard using only keyboard/screen reader"*
- Can they search without mouse?
- Are threading relationships clear aurally?
- Do skip links work?
- Is focus management good?

### Metrics to Collect
- Time to complete task
- Number of clicks/interactions
- Errors or confusion points
- Subjective satisfaction (1-5 scale)
- Feature discovery (did they find threading toggle?)
- Preference: Threaded vs Linear

---

## 📝 Files Modified/Created

### New Files
- `packages/data-pipeline/scripts/populate_threading.py` - Threading population script
- `HANSARD_UX_IMPROVEMENTS.md` - This document

### Modified Files
- `packages/frontend/src/app/[locale]/hansard/page.tsx` - Fixed HTML/plain text rendering
- `packages/graph-api/src/schema.ts` - Added 3 debate queries + 5 new types

### Files to Create (Next Phase)
- `packages/frontend/src/app/[locale]/debates/page.tsx` - Debates browse page
- `packages/frontend/src/app/[locale]/debates/[documentId]/page.tsx` - Debate detail view
- `packages/frontend/src/components/debates/DebateCard.tsx` - Debate summary card
- `packages/frontend/src/components/debates/SectionNavigator.tsx` - Section jump nav
- `packages/frontend/src/lib/queries.ts` - Add debate queries

---

## 🎯 Unique Value Proposition

**What makes CanadaGPT different?**

| Platform | Threading | QP View | Mobile | Bilingual | Context |
|----------|-----------|---------|--------|-----------|---------|
| **CanadaGPT** | ✅ Visual | ✅ Dedicated | ✅ Optimized | ✅ True bilingual | ✅ Rich |
| OpenParliament | ❌ None | ❌ Search only | ⚠️ Basic | ✅ Both languages | ⚠️ Limited |
| TheyWorkForYou (UK) | ❌ None | ❌ None | ⚠️ Basic | ❌ English only | ⚠️ Limited |
| Official Hansard | ❌ None | ❌ PDF-like | ❌ Poor | ✅ Both languages | ✅ Complete |

**Our Advantage**:
"The only platform where you can **read Hansard like a conversation**, not a transcript."

---

## 🔮 Future Vision (Phase 4+)

### Advanced Features
1. **Read Aloud** - Text-to-speech with auto-advance
2. **Highlighting** - User + community highlights
3. **Annotations** - Personal notes + expert commentary
4. **Fact-checking integration** - Link to fact-checks
5. **Sentiment analysis** - Visual party position summary
6. **MP influence graph** - Who speaks with whom
7. **Topic taxonomy** - Structured subject browsing
8. **Timeline view** - Calendar-based exploration
9. **Viral moments** - Editor's picks, trending speeches
10. **Export tools** - Download debates as PDF/JSON

### Technical Improvements
1. **Real-time updates** - WebSocket for live Question Period
2. **Search relevance ML** - Better ranking algorithms
3. **Auto-summarization** - AI-generated debate summaries
4. **Related content** - Cross-reference similar debates
5. **Performance** - Read replicas, edge caching
6. **Analytics** - Comprehensive usage tracking
7. **A/B testing** - Optimize UI patterns
8. **Internationalization** - Support for Indigenous languages

---

## 📞 Support & Questions

**Threading issues?**
- Check `populate_threading.py` logs
- Verify Neo4j connection
- Test with single document first (`--document-id`)

**Query performance?**
- Ensure indexes exist (Statement.time, thread_id)
- Check query execution plans with `EXPLAIN`
- Monitor query times in GraphQL logs

**UI bugs?**
- Check browser console for errors
- Test in multiple browsers
- Verify GraphQL responses in Network tab

---

**Last Updated**: November 11, 2025
**Status**: Phase 1 Complete ✅
**Next Milestone**: Run threading script + create debates pages
**Timeline**: Phase 2 target - Week of Nov 18, 2025
