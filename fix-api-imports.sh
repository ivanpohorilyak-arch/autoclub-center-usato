#!/usr/bin/env bash

set -e

echo "Correzione import API route in corso..."

find app/api -type f -name "route.ts" | while read -r file; do
  echo "Controllo: $file"

  sed -i 's|from "\.\./\.\./\.\./lib/auth-guard"|from "../../../../lib/auth-guard"|g' "$file"
  sed -i 's|from "\.\./\.\./\.\./lib/audit-log"|from "../../../../lib/audit-log"|g' "$file"

  sed -i "s|from '\.\./\.\./\.\./lib/auth-guard'|from '../../../../lib/auth-guard'|g" "$file"
  sed -i "s|from '\.\./\.\./\.\./lib/audit-log'|from '../../../../lib/audit-log'|g" "$file"
done

echo "Import corretti."
echo "Adesso puoi lanciare:"
echo "npm run build"
