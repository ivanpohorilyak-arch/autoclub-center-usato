#!/usr/bin/env bash

echo "Conversione import verso alias assoluto @/lib..."

find app/api -type f -name "route.ts" | while read -r file; do
  sed -i 's|from "../../../../../lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"
  sed -i 's|from "../../../../lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"
  sed -i 's|from "../../../lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"

  sed -i 's|from "../../../../../lib/audit-log"|from "@/lib/audit-log"|g' "$file"
  sed -i 's|from "../../../../lib/audit-log"|from "@/lib/audit-log"|g' "$file"
  sed -i 's|from "../../../lib/audit-log"|from "@/lib/audit-log"|g' "$file"
done

echo "Import convertiti a @/lib"
