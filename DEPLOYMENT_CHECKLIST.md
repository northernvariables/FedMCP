# CanadaGPT Deployment Checklist

**Date**: November 11, 2025
**Features**: Neo4j Optimizations + Hansard Conversational UX
**Status**: ✅ Ready for Production Deployment

---

## 🎯 What's Being Deployed

### 1. Neo4j Performance Optimizations (40-70% faster queries)
- 11 new property indexes
- 7 new uniqueness constraints
- Query result caching (randomMPs, topSpenders)
- Optimized full-text search queries

### 2. Hansard Conversational UX (Debates as Conversations)
- Debates browse page (`/debates`)
- Full debate detail view (`/debates/[documentId]`)
- Section navigation (jump to Question Period, etc.)
- Threading population script
- Fixed HTML/plain text rendering

---

## ✅ Pre-Deployment Checklist

### Backend (Graph API)

- [ ] **1. Build Graph API**
  ```bash
  cd packages/graph-api
  pnpm install
  pnpm build
  ```
  **Expected**: No TypeScript errors, clean build

- [ ] **2. Create Neo4j Indexes**
  ```bash
  cd packages/graph-api
  pnpm create-indexes
  ```
  **Expected**: 41 total indexes created
  **Time**: 5-10 minutes
  **Verify**: Run `SHOW INDEXES` in Neo4j Browser

- [ ] **3. Create Neo4j Constraints**
  ```bash
  cd packages/graph-api
  pnpm create-constraints
  ```
  **Expected**: 14 total constraints created
  **Time**: 2-5 minutes
  **Verify**: Run `SHOW CONSTRAINTS` in Neo4j Browser

- [ ] **4. Verify Index Creation**
  ```cypher
  SHOW INDEXES YIELD name, type, labelsOrTypes, properties
  RETURN count(*) AS total_indexes;
  // Expected: 41 indexes
  ```

- [ ] **5. Verify Constraint Creation**
  ```cypher
  SHOW CONSTRAINTS YIELD name, type
  RETURN count(*) AS total_constraints;
  // Expected: 14 constraints
  ```

### Data Pipeline (Threading Population)

- [ ] **6. Test Threading Script (Dry Run)**
  ```bash
  cd packages/data-pipeline
  python scripts/populate_threading.py --dry-run --verbose
  ```
  **Expected**: Preview of threading without writing to DB
  **Time**: 5-10 minutes (analysis only)

- [ ] **7. Run Threading Population Script**
  ```bash
  cd packages/data-pipeline
  python scripts/populate_threading.py --verbose
  ```
  **Expected**:
  - ~100,000 statements analyzed
  - ~18,000-20,000 threads created
  - ~80,000-85,000 REPLIES_TO relationships
  **Time**: 30-45 minutes
  **⚠️ CRITICAL**: Must complete before deploying frontend

- [ ] **8. Verify Threading Data**
  ```cypher
  // Check threaded statements
  MATCH (s:Statement)
  WHERE s.thread_id IS NOT NULL
  RETURN count(s) AS threaded_statements;
  // Expected: ~80,000-90,000 (80-90% of statements)

  // Check REPLIES_TO relationships
  MATCH ()-[r:REPLIES_TO]->()
  RETURN count(r) AS reply_relationships;
  // Expected: ~80,000-85,000

  // Sample a thread to verify structure
  MATCH (root:Statement {sequence_in_thread: 0})
  WHERE root.thread_id IS NOT NULL
  MATCH (reply:Statement {thread_id: root.thread_id})
  WHERE reply.sequence_in_thread > 0
  RETURN
    root.who_en AS root_speaker,
    root.statement_type AS root_type,
    root.content_en AS root_content,
    collect({
      who: reply.who_en,
      type: reply.statement_type,
      sequence: reply.sequence_in_thread
    }) AS replies
  ORDER BY root.time DESC
  LIMIT 5;
  // Expected: See Q&A threads with proper sequencing
  ```

### Frontend

- [ ] **9. Build Frontend**
  ```bash
  cd packages/frontend
  pnpm install
  pnpm build
  ```
  **Expected**: No build errors, clean production build
  **Check**: No missing translations warnings

- [ ] **10. Test Locally (Optional)**
  ```bash
  cd packages/frontend
  pnpm dev
  ```
  **Test**:
  - Visit `/debates` - Should show debate list
  - Click debate - Should show full debate view
  - Check threading toggle works
  - Verify section navigation
  - Test both EN and FR translations

### Verification

- [ ] **11. Check All Files Are Committed**
  ```bash
  git status
  ```
  **Expected**: No uncommitted changes (or commit if needed)

- [ ] **12. Review Changed Files**
  ```bash
  git diff HEAD~1
  ```
  **Verify**: All changes are intentional

---

## 🚀 Deployment Steps

### Option 1: Cloud Run (Recommended)

- [ ] **1. Deploy Graph API**
  ```bash
  cd packages/graph-api
  ./scripts/deploy-cloud-run.sh
  ```
  **Expected**: Successful deployment, new revision created
  **Verify**: Check Cloud Run logs for startup

- [ ] **2. Deploy Frontend**
  ```bash
  cd packages/frontend
  ./scripts/deploy-frontend-cloudrun.sh
  ```
  **Expected**: Successful deployment, new revision created

- [ ] **3. Verify Deployment**
  - Visit production URL
  - Test `/debates` page
  - Click into a debate
  - Verify threading works
  - Test search functionality
  - Check performance (should be faster)

### Option 2: Manual Deployment

- [ ] **1. Build Production Images**
  ```bash
  # Graph API
  cd packages/graph-api
  docker build --platform linux/amd64 -t canadagpt-graph-api .

  # Frontend
  cd packages/frontend
  docker build -t canadagpt-frontend .
  ```

- [ ] **2. Push to Registry**
  ```bash
  docker push <your-registry>/canadagpt-graph-api:latest
  docker push <your-registry>/canadagpt-frontend:latest
  ```

- [ ] **3. Deploy to Production**
  (Follow your deployment process)

---

## 🧪 Post-Deployment Testing

### Critical Path Tests

- [ ] **1. Test Debate Browse Page**
  - [ ] Visit `/debates`
  - [ ] Filter: All | House Debates | Committee | Question Period
  - [ ] Verify debate cards show correctly
  - [ ] Click "View Debate" button

- [ ] **2. Test Debate Detail Page**
  - [ ] Click into any debate
  - [ ] Verify context card shows (date, stats)
  - [ ] Test section navigator (jump to sections)
  - [ ] Toggle threading ON/OFF
  - [ ] Verify statements render correctly
  - [ ] Check paragraph formatting (no HTML)
  - [ ] Test "Read more" expansion

- [ ] **3. Test Threading (CRITICAL)**
  - [ ] Enable threading toggle
  - [ ] Look for threaded conversations
  - [ ] Verify Q&A pairs are grouped
  - [ ] Check "Show N replies" buttons work
  - [ ] Verify party-colored borders on replies
  - [ ] Check chronological order in linear view

- [ ] **4. Test Performance**
  - [ ] MP detail page - Should load < 200ms
  - [ ] Lobbying search - Should complete < 200ms
  - [ ] Dashboard - Should load < 100ms (cached)
  - [ ] Hansard search - Should return < 500ms

- [ ] **5. Test Bilingual Support**
  - [ ] Switch to French (`/fr/debates`)
  - [ ] Verify all labels translated
  - [ ] Check debate content shows in French
  - [ ] Test filtering in French

- [ ] **6. Test Mobile**
  - [ ] Open on mobile device
  - [ ] Navigate to debates page
  - [ ] Test filters (should work well)
  - [ ] Open debate detail
  - [ ] Verify threading works on mobile
  - [ ] Check section navigator (dropdown on mobile)

### Performance Verification

- [ ] **7. Check Cache Hit Rates**
  - Open browser DevTools → Network
  - Visit dashboard multiple times
  - Verify subsequent loads are faster
  - Check server logs for cache hits

- [ ] **8. Monitor Query Times**
  ```bash
  # Check Cloud Run logs
  gcloud logging read "resource.type=cloud_run_revision" --limit 50
  ```
  - Look for slow query warnings (>500ms)
  - Verify most queries < 200ms
  - Check no query timeout errors

### Error Monitoring

- [ ] **9. Check for Errors**
  - [ ] Browser console - No JavaScript errors
  - [ ] Network tab - No 500 errors
  - [ ] GraphQL errors - None expected
  - [ ] Neo4j logs - No connection issues

- [ ] **10. Test Edge Cases**
  - [ ] Empty search results
  - [ ] Debate with no statements (shouldn't exist)
  - [ ] Statement with no thread_id (should work)
  - [ ] Very long statements (test "Read more")
  - [ ] Special characters in content

---

## 📊 Success Metrics (Monitor Over Next Week)

### Performance Metrics

| Metric | Baseline | Target | Actual |
|--------|----------|--------|--------|
| MP Detail Load | 200-300ms | <120ms | ___ |
| Lobbying Search | 500ms | <100ms | ___ |
| Dashboard Load (cached) | 400ms | <40ms | ___ |
| Debate Page Load | N/A | <300ms | ___ |
| Hansard Search | 300ms | <250ms | ___ |

### Usage Metrics

| Metric | Target | Week 1 | Notes |
|--------|--------|--------|-------|
| Debates page views | 100+/day | ___ | Track adoption |
| Threading toggle use | >60% enable | ___ | Key feature |
| Avg session duration | >5 min | ___ | Up from ~2 min |
| Bounce rate | <40% | ___ | Down from ~55% |
| Mobile traffic | 60-70% | ___ | Expected majority |

### Error Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| 500 errors | <1% requests | ___ |
| GraphQL errors | <0.5% | ___ |
| Timeout errors | <0.1% | ___ |
| JavaScript errors | <1% sessions | ___ |

---

## 🐛 Rollback Plan

### If Critical Issues Occur

**Symptoms:**
- High error rates (>5%)
- Performance regression (queries >2x slower)
- Threading not working at all
- Widespread JavaScript errors

**Rollback Steps:**

1. **Revert Frontend Deployment**
   ```bash
   # Cloud Run
   gcloud run services update-traffic canadagpt-frontend \
     --to-revisions=PREVIOUS_REVISION=100

   # Or redeploy previous version
   git checkout <previous-commit>
   ./scripts/deploy-frontend-cloudrun.sh
   ```

2. **Revert Graph API (if needed)**
   ```bash
   gcloud run services update-traffic canadagpt-graph-api \
     --to-revisions=PREVIOUS_REVISION=100
   ```

3. **Keep Neo4j Changes**
   - DO NOT drop indexes (they only help performance)
   - DO NOT drop constraints (data integrity)
   - Threading data is additive (won't hurt existing queries)

4. **Investigate Issue**
   - Check logs for error patterns
   - Review recent changes
   - Test in staging environment
   - Fix and redeploy

---

## 📞 Support Contacts

**If Issues Arise:**
1. Check `HANSARD_UX_IMPROVEMENTS.md` for troubleshooting
2. Check `NEO4J_OPTIMIZATIONS.md` for query issues
3. Review Cloud Run logs
4. Check Neo4j Browser for data issues

**Known Issues / Workarounds:**
- **Threading not showing**: Verify script completed, check `thread_id` populated
- **Slow queries**: Verify indexes created with `SHOW INDEXES`
- **Cache not working**: Check server logs, verify cache utility imported
- **Translation missing**: Add to `messages/en.json` and `messages/fr.json`

---

## ✅ Deployment Approval

**Pre-Deployment Checklist Complete**: ☐ YES ☐ NO

**Threading Script Run Successfully**: ☐ YES ☐ NO

**All Tests Passing**: ☐ YES ☐ NO

**Rollback Plan Understood**: ☐ YES ☐ NO

**Approved By**: ___________________ **Date**: _______________

---

## 📝 Post-Deployment Notes

**Deployment Date**: _______________

**Deployment Time**: _______________

**Deployed By**: _______________

**Issues Encountered**:
-
-
-

**Resolutions**:
-
-
-

**Performance Observations**:
-
-
-

**User Feedback**:
-
-
-

---

**Last Updated**: November 11, 2025
**Version**: 1.0
**Status**: ✅ Ready for Production
