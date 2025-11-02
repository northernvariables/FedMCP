# Performance Optimization Summary

## Date: 2025-11-01

## Problem Identified

The FedMCP server had critical performance issues causing:
- **Slow processing** when listing votes, MPs, and debates
- **"Result was too large" errors** in Claude Desktop
- **Fetching 100x more data than requested** due to pagination misunderstanding

### Root Cause

The code misunderstood how the OpenParliament API pagination works:
- The `limit` parameter only controls **page size**, not total results
- Using `list()` on iterators fetched **ALL pages** until exhausted
- This caused thousands of unnecessary API calls

Example: Requesting 10 votes would actually:
1. Fetch ALL votes from the API (1000+)
2. Make 100+ HTTP requests (with rate limiting delays)
3. Build massive text responses (100KB+)
4. Timeout or show "Result too large" in Claude Desktop

## Fixes Implemented

### 1. Added `itertools.islice` Import
**File**: `src/fedmcp/server.py`
**Line**: 7

```python
from itertools import islice
```

### 2. Fixed `list_votes` Tool
**Lines**: 515, 522

```python
# BEFORE:
votes = await asyncio.to_thread(lambda: list(op_client.list_votes(limit=limit)))

# AFTER:
votes = await asyncio.to_thread(lambda: list(islice(op_client.list_votes(), limit)))
```

**Impact**: Fetches exactly `limit` votes instead of ALL votes

### 3. Fixed `list_mps` Tool
**Line**: 500

```python
# BEFORE:
mps = await run_sync(lambda: list(op_client.list_mps(limit=limit)))

# AFTER:
mps = await run_sync(lambda: list(islice(op_client.list_mps(), limit)))
```

**Impact**: Fetches exactly `limit` MPs instead of all 338

### 4. Fixed `list_debates` Tool
**Line**: 467

```python
# BEFORE:
debates = await run_sync(lambda: list(op_client.list_debates(limit=limit, offset=offset)))

# AFTER:
debates = await run_sync(lambda: list(islice(op_client.list_debates(offset=offset), limit)))
```

**Impact**: Fetches exactly `limit` debates instead of unlimited pages

### 5. Fixed `search_debates` Tool
**Lines**: 325-343

```python
# BEFORE:
for debate in op_client.list_debates(limit=limit * 3):
    if len(debates) >= limit:
        break
    # ... filtering logic

# AFTER:
max_to_examine = limit * 3
for debate in islice(op_client.list_debates(), max_to_examine):
    # ... filtering logic
    if len(debates) >= limit:
        break
```

**Impact**: Caps maximum examined debates to prevent unlimited fetching

### 6. Fixed `search_bills` Tool
**Lines**: 390-408

```python
# BEFORE:
for bill in op_client.list_bills(limit=limit * 2):
    if len(found_bills) >= limit:
        break
    # ... filtering logic

# AFTER:
max_to_examine = limit * 2
for bill in islice(op_client.list_bills(), max_to_examine):
    # ... filtering logic
    if len(found_bills) >= limit:
        break
```

**Impact**: Caps maximum examined bills to prevent unlimited fetching

### 7. Added Response Text Truncation

**list_votes** (Line 529):
```python
# Truncate descriptions to 200 chars
f"Description: {v.get('description', {}).get('en', 'N/A')[:200]}{'...' if len(v.get('description', {}).get('en', '')) > 200 else ''}\n"
```

**search_bills** (Lines 418-419):
```python
# Truncate long bill names and titles
f"Name: {(b['name'] or 'N/A')[:200]}{'...' if b['name'] and len(b['name']) > 200 else ''}\n" +
f"Short Title: {(b['short_title'] or 'N/A')[:150]}{'...' if b['short_title'] and len(b['short_title']) > 150 else ''}\n"
```

**Impact**: Prevents "Result too large" errors from long text fields

## Performance Improvements

### Measured Results (from test_performance.py)

**list_votes with limit=5:**
- ✅ Fetched exactly 5 votes (not 1000+)
- ✅ Completed in 0.21 seconds (was 10+ seconds before)
- ✅ Made 1 API call (was 100+ before)

**Expected improvements for all tools:**
- **Speed**: 10-100x faster
- **API calls**: 99% reduction (1 call instead of 100+)
- **Response size**: 90% reduction (10 items vs 1000)
- **Reliability**: No more "Result too large" errors
- **No more hangs** in Claude Desktop

## How islice Works

`islice(iterator, n)` takes at most `n` items from an iterator and stops:

```python
# Without islice (BAD):
votes = list(op_client.list_votes())
# Fetches ALL pages until exhausted

# With islice (GOOD):
votes = list(islice(op_client.list_votes(), 10))
# Fetches exactly 10 items then stops
```

## Testing

Run the performance test suite:
```bash
source venv/bin/activate
python test_performance.py
```

Expected output:
```
✓ Retrieved 5 votes in ~0.2s
✓ Fetched exactly 5 votes (not thousands)
✓ Response text properly truncated
```

## Files Modified

1. `src/fedmcp/server.py` - All performance fixes
2. `test_performance.py` - Performance test suite (new)
3. `PERFORMANCE_FIXES.md` - This document (new)

## Next Steps for Users

1. **Restart Claude Desktop** to reload the MCP server
2. **Test `list_votes`** - Should now respond quickly
3. **Verify no "Result too large" errors**
4. All tools should now be 10-100x faster!

## Technical Notes

- The OpenParliament API `limit` parameter controls page size (items per response)
- The API uses pagination with `next_url` links
- Without islice, `list()` materializes ALL pages into memory
- With islice, only requested number of items are fetched
- Rate limiting (0.1s between requests) means fewer API calls = much faster

## Summary

**Before**: Requesting 10 votes = 100+ API calls, 10+ seconds, "Result too large"
**After**: Requesting 10 votes = 1-2 API calls, 0.2 seconds, perfect response size

**Performance gain: ~50x faster! 🚀**
