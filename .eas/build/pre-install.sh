#!/usr/bin/env bash

set -euo pipefail

echo "🔍 Checking for GOOGLE_SERVICES_JSON environment variable..."

# Write the GOOGLE_SERVICES_JSON environment variable to google-services.json
if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "✅ GOOGLE_SERVICES_JSON found, writing to file..."
  echo "$GOOGLE_SERVICES_JSON" > "$EAS_BUILD_WORKINGDIR/google-services.json"
  echo "✅ google-services.json created successfully"
  ls -lh "$EAS_BUILD_WORKINGDIR/google-services.json"
  echo "📄 File content preview:"
  head -3 "$EAS_BUILD_WORKINGDIR/google-services.json"
else
  echo "❌ GOOGLE_SERVICES_JSON environment variable not found"
  echo "Available environment variables:"
  env | grep -i google || echo "No Google-related env vars"
  exit 1
fi
