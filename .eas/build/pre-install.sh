#!/usr/bin/env bash

set -euo pipefail

echo "🔍 Setting up google-services.json..."

# Check if GOOGLE_SERVICES_JSON environment variable exists
if [ -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "❌ GOOGLE_SERVICES_JSON environment variable not found"
  echo "Available environment variables:"
  env | grep GOOGLE || echo "No Google env vars found"
  exit 1
fi

# Write the file content to google-services.json
echo "$GOOGLE_SERVICES_JSON" > "${EAS_BUILD_WORKINGDIR}/google-services.json"

# Verify the file was created
if [ -f "${EAS_BUILD_WORKINGDIR}/google-services.json" ]; then
  echo "✅ google-services.json created successfully"
  echo "📄 File size: $(wc -c < "${EAS_BUILD_WORKINGDIR}/google-services.json") bytes"
  echo "📄 First line: $(head -1 "${EAS_BUILD_WORKINGDIR}/google-services.json")"
else
  echo "❌ Failed to create google-services.json"
  exit 1
fi
