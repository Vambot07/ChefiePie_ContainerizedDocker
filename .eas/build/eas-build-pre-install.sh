#!/usr/bin/env bash

set -euo pipefail

# Write the GOOGLE_SERVICES_JSON environment variable to google-services.json
if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "$GOOGLE_SERVICES_JSON" > "$EAS_BUILD_WORKINGDIR/google-services.json"
  echo "✅ google-services.json created from environment variable"
else
  echo "⚠️  GOOGLE_SERVICES_JSON environment variable not found"
fi
