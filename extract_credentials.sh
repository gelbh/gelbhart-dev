#!/bin/bash
# Extract Google Analytics OAuth credentials for production deployment

echo "==================================================================="
echo "Google Analytics - Credential Extractor for Production"
echo "==================================================================="
echo ""
echo "Copy these values to your Render.com Environment Variables:"
echo ""

if [ -f "config/google-oauth-credentials.json" ]; then
  echo "# OAuth Client Credentials"
  echo "# -------------------------"
  CLIENT_ID=$(cat config/google-oauth-credentials.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('web', data.get('installed', {})).get('client_id', 'NOT_FOUND'))")
  CLIENT_SECRET=$(cat config/google-oauth-credentials.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('web', data.get('installed', {})).get('client_secret', 'NOT_FOUND'))")

  echo "GOOGLE_OAUTH_CLIENT_ID=$CLIENT_ID"
  echo "GOOGLE_OAUTH_CLIENT_SECRET=$CLIENT_SECRET"
  echo ""
else
  echo "ERROR: config/google-oauth-credentials.json not found"
  echo "Make sure you've run: rails analytics:authorize"
  exit 1
fi

if [ -f "config/analytics-tokens.yaml" ]; then
  echo "# OAuth Tokens"
  echo "# -------------------------"
  REFRESH_TOKEN=$(cat config/analytics-tokens.yaml | python3 -c "import sys, json, yaml; data=yaml.safe_load(sys.stdin); token=json.loads(data['default']); print(token.get('refresh_token', 'NOT_FOUND'))")
  ACCESS_TOKEN=$(cat config/analytics-tokens.yaml | python3 -c "import sys, json, yaml; data=yaml.safe_load(sys.stdin); token=json.loads(data['default']); print(token.get('access_token', 'NOT_FOUND'))")

  echo "GOOGLE_OAUTH_REFRESH_TOKEN=$REFRESH_TOKEN"
  echo "GOOGLE_OAUTH_ACCESS_TOKEN=$ACCESS_TOKEN"
  echo ""
else
  echo "ERROR: config/analytics-tokens.yaml not found"
  echo "Make sure you've run: rails analytics:authorize"
  exit 1
fi

echo "# GA4 Property"
echo "# -------------------------"
echo "GA4_PROPERTY_ID=468479218"
echo ""
echo "==================================================================="
echo "✓ Done! Copy all the above to Render.com > Environment"
echo "==================================================================="
