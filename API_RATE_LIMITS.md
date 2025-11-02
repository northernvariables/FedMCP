# API Rate Limiting Summary

This document summarizes the rate limiting and best practices implemented for each data source used by FedMCP.

## Implemented Rate Limits

### CanLII (Canadian Legal Information Institute)
**Official Limits:**
- 5,000 queries per day
- 2 requests per second
- 1 concurrent request

**Our Implementation:**
- ✅ Enforces 2 requests/second limit (0.5 second minimum interval between requests)
- ✅ Synchronous execution ensures 1 concurrent request
- ✅ Exponential backoff retry for 429/5xx errors
- ✅ API key required (configured in .env)

### OpenParliament API
**Official Guidance:**
- No specific rate limits published
- Returns HTTP 429 "Too Many Requests" if limits exceeded
- Recommends User-Agent header with email
- Requires API-Version header (v1)

**Our Implementation:**
- ✅ Conservative rate limiting: 10 requests/second (0.1 second minimum interval)
- ✅ User-Agent includes email: "Connexxia-Agent (matt@thoughtforge.com)"
- ✅ API-Version header set to "v1"
- ✅ Exponential backoff retry for 429/5xx errors

### LEGISinfo (Parliament of Canada)
**Type:** Static data export service (JSON/XML files)

**Our Implementation:**
- ℹ️ No rate limiting needed - serves static files
- ✅ Standard retry logic for network errors

### House of Commons Hansard (OurCommons)
**Type:** Static document service (XML via DocumentViewer)

**Our Implementation:**
- ℹ️ No rate limiting needed - serves static XML documents
- ✅ Standard retry logic for network errors

## Rate Limiting Architecture

All rate limiting is implemented in `RateLimitedSession` (src/fedmcp/http.py):

### Proactive Rate Limiting
- Enforces minimum time between requests via `min_request_interval` parameter
- Automatically delays requests if they come too quickly
- Prevents hitting rate limits before they occur

### Reactive Retry Logic
- Detects 429 (rate limit) and 5xx (server error) responses
- Implements exponential backoff: sleeps for `backoff_factor * 2^(attempt-1)` seconds
- Maximum retry attempts configurable (default: 5)

## Best Practices Followed

1. **User-Agent Headers**: All clients identify themselves with contact information
2. **API Versioning**: OpenParliament requests specify API version for compatibility
3. **Conservative Limits**: We use more conservative limits than required to be respectful
4. **Graceful Degradation**: Automatic retry with exponential backoff for transient failures
5. **Documentation**: Clear documentation of limits for future maintainers

## Attribution

As recommended by OpenParliament, when using this data in applications:
- Provide attribution by linking back to openparliament.ca
- Acknowledge that parliamentary content is Crown copyright
- Note that CanFedInfo/FedMCP code is MIT licensed but data sources have their own terms

## Contact Information

If experiencing issues with API access:
- OpenParliament: Contact via their mailing list or GitHub issues
- CanLII: Contact via feedback form at https://www.canlii.org/en/feedback/feedback.html
- LEGISinfo/OurCommons: Contact via Parliament of Canada info@parl.gc.ca
