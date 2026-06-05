#!/usr/bin/env bash
# Deploys the Cognito user pool + Google/Apple sign-in, then prints the four
# values you paste into config.js. Run from anywhere; paths are resolved here.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f parameters.sh ]; then
  echo "❌ infra/parameters.sh not found."
  echo "   Copy infra/parameters.example.sh to infra/parameters.sh and fill it in."
  exit 1
fi
# shellcheck source=/dev/null
source parameters.sh

if [ ! -f "$APPLE_PRIVATE_KEY_FILE" ]; then
  echo "❌ Apple key file not found at: $APPLE_PRIVATE_KEY_FILE"
  echo "   Set APPLE_PRIVATE_KEY_FILE in parameters.sh to your downloaded .p8 file."
  exit 1
fi
APPLE_PRIVATE_KEY="$(cat "$APPLE_PRIVATE_KEY_FILE")"

echo "🚀 Deploying stack '$STACK_NAME' to $AWS_REGION ..."
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file cognito.yaml \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    DomainPrefix="$DOMAIN_PREFIX" \
    CallbackURLs="$CALLBACK_URLS" \
    LogoutURLs="$LOGOUT_URLS" \
    GoogleClientId="$GOOGLE_CLIENT_ID" \
    GoogleClientSecret="$GOOGLE_CLIENT_SECRET" \
    AppleServicesId="$APPLE_SERVICES_ID" \
    AppleTeamId="$APPLE_TEAM_ID" \
    AppleKeyId="$APPLE_KEY_ID" \
    ApplePrivateKey="$APPLE_PRIVATE_KEY"

echo ""
echo "✅ Deployed. Copy these into your config.js:"
echo "────────────────────────────────────────────"
aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='Region'||OutputKey=='UserPoolId'||OutputKey=='ClientId'||OutputKey=='CognitoDomain'].[OutputKey,OutputValue]" \
  --output text
echo "────────────────────────────────────────────"
echo ""
echo "📌 Also paste this URL into Google AND Apple as the redirect/return URL:"
aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ProviderRedirectURL'].OutputValue" \
  --output text
