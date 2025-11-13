#!/bin/bash
set -e

echo "Setting up Stripe secrets in Google Cloud Secret Manager..."
echo ""
echo "You'll need to provide:"
echo "1. Stripe Secret Key (starts with sk_test_ or sk_live_)"
echo "2. Stripe Publishable Key (starts with pk_test_ or pk_live_)"
echo "3. Stripe Webhook Secret (starts with whsec_)"
echo ""

# Check if secrets already exist
SECRETS_TO_CREATE=()

if ! gcloud secrets describe stripe-secret-key &>/dev/null; then
  SECRETS_TO_CREATE+=("stripe-secret-key")
fi

if ! gcloud secrets describe stripe-publishable-key &>/dev/null; then
  SECRETS_TO_CREATE+=("stripe-publishable-key")
fi

if ! gcloud secrets describe stripe-webhook-secret &>/dev/null; then
  SECRETS_TO_CREATE+=("stripe-webhook-secret")
fi

if [ ${#SECRETS_TO_CREATE[@]} -eq 0 ]; then
  echo "All Stripe secrets already exist!"
  echo ""
  echo "To update them, use:"
  echo "  echo 'your-new-value' | gcloud secrets versions add stripe-secret-key --data-file=-"
  exit 0
fi

echo "Will create the following secrets: ${SECRETS_TO_CREATE[@]}"
echo ""

# Create secrets
for secret in "${SECRETS_TO_CREATE[@]}"; do
  echo "Enter value for $secret:"
  read -s value
  echo "$value" | gcloud secrets create "$secret" --data-file=- --replication-policy="automatic"
  echo "✓ Created $secret"
  echo ""
done

echo "✓ All Stripe secrets created!"
echo ""
echo "Granting Cloud Run service account access..."

# Grant access to the Cloud Run service account
SERVICE_ACCOUNT="canadagpt-frontend@canadagpt-443319.iam.gserviceaccount.com"

for secret in stripe-secret-key stripe-publishable-key stripe-webhook-secret; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "✓ Access granted!"
echo ""
echo "Next steps:"
echo "1. For local development, add to .env.local:"
echo "   STRIPE_SECRET_KEY=sk_test_..."
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "2. For production, update Cloud Run deployment to use secrets"
echo "3. Set up Stripe webhook endpoint in Stripe Dashboard:"
echo "   URL: https://canada-gpt.ca/api/stripe/webhook"
echo "   Events: checkout.session.completed, setup_intent.succeeded, payment_intent.succeeded"
