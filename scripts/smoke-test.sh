#!/bin/bash
# Smoke Test Script for CanadaGPT Graph API
# Tests basic functionality after deployment

set -euo pipefail

SERVICE_URL=$1
ORIGIN=${2:-https://canadagpt.ca}
API_KEY=${3:-}

if [ -z "$SERVICE_URL" ]; then
  echo "Usage: $0 <service-url> [origin] [api-key]"
  echo "Example: $0 https://canadagpt-graph-api-xxx.run.app https://canadagpt.ca your-api-key"
  exit 1
fi

echo "🧪 Running smoke tests against $SERVICE_URL..."
echo "   Using origin: $ORIGIN"
if [ -n "$API_KEY" ]; then
  echo "   Using API key: ${API_KEY:0:8}..."
fi
echo ""

FAILED=0

# Test 1: GraphQL introspection
echo "Test 1: GraphQL introspection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/graphql?query={__typename}")
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Introspection failed (HTTP $HTTP_CODE)"
  FAILED=$((FAILED + 1))
else
  echo "✅ Introspection passed (HTTP 200)"
fi
echo ""

# Test 2: CORS preflight request
echo "Test 2: CORS preflight (OPTIONS)..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  "${SERVICE_URL}/graphql")

HTTP_CODE=$(echo "$CORS_RESPONSE" | grep -i "^HTTP" | awk '{print $2}')
if [ "$HTTP_CODE" != "204" ] && [ "$HTTP_CODE" != "200" ]; then
  echo "❌ CORS preflight failed (HTTP $HTTP_CODE)"
  FAILED=$((FAILED + 1))
else
  echo "✅ CORS preflight passed (HTTP $HTTP_CODE)"
fi

# Check CORS headers
CORS_ORIGIN=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" | cut -d' ' -f2 | tr -d '\r\n')
if [ -z "$CORS_ORIGIN" ]; then
  echo "❌ CORS header missing"
  FAILED=$((FAILED + 1))
elif [ "$CORS_ORIGIN" != "$ORIGIN" ]; then
  echo "⚠️  CORS header mismatch: expected '$ORIGIN', got '$CORS_ORIGIN'"
  echo "   (This may be acceptable if using wildcard or multiple origins)"
else
  echo "✅ CORS header correct: $CORS_ORIGIN"
fi

CORS_CREDENTIALS=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-credentials" | cut -d' ' -f2 | tr -d '\r\n')
if [ "$CORS_CREDENTIALS" != "true" ]; then
  echo "⚠️  CORS credentials not set to 'true'"
else
  echo "✅ CORS credentials enabled"
fi
echo ""

# Test 3: Sample GraphQL query
echo "Test 3: Sample MP query..."
QUERY='{"query":"{ mps(options: { limit: 1 }) { name party } }"}'
if [ -n "$API_KEY" ]; then
  RESPONSE=$(curl -s -X POST "${SERVICE_URL}/graphql" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -H "X-API-Key: $API_KEY" \
    -d "$QUERY")
else
  RESPONSE=$(curl -s -X POST "${SERVICE_URL}/graphql" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d "$QUERY")
fi

if echo "$RESPONSE" | grep -q '"errors"'; then
  echo "❌ GraphQL query returned errors:"
  echo "$RESPONSE" | head -10
  FAILED=$((FAILED + 1))
elif echo "$RESPONSE" | grep -q '"name"'; then
  echo "✅ GraphQL query successful"
  echo "   Sample data: $(echo "$RESPONSE" | head -c 100)..."
else
  echo "⚠️  GraphQL query returned unexpected format:"
  echo "$RESPONSE" | head -10
fi
echo ""

# Test 4: Response time check
echo "Test 4: Response time check..."
START_TIME=$(date +%s%N)
curl -s -o /dev/null "${SERVICE_URL}/graphql?query={__typename}"
END_TIME=$(date +%s%N)
DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $DURATION_MS -gt 5000 ]; then
  echo "⚠️  Slow response: ${DURATION_MS}ms (expected < 5000ms)"
elif [ $DURATION_MS -gt 2000 ]; then
  echo "⚠️  Response time: ${DURATION_MS}ms (acceptable, but could be faster)"
else
  echo "✅ Response time: ${DURATION_MS}ms"
fi
echo ""

# Summary
echo "═══════════════════════════════════"
if [ $FAILED -eq 0 ]; then
  echo "✅ All smoke tests passed!"
  echo "═══════════════════════════════════"
  exit 0
else
  echo "❌ $FAILED test(s) failed"
  echo "═══════════════════════════════════"
  exit 1
fi
