#!/usr/bin/env bash

set -e

echo "==> 1/4 Correzione import verso alias @/lib"

find app -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  sed -i 's|from "\.\./\.\./\.\./lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"
  sed -i 's|from "\.\./\.\./\.\./\.\./lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"
  sed -i 's|from "\.\./\.\./\.\./\.\./\.\./lib/auth-guard"|from "@/lib/auth-guard"|g' "$file"

  sed -i "s|from '\.\./\.\./\.\./lib/auth-guard'|from '@/lib/auth-guard'|g" "$file"
  sed -i "s|from '\.\./\.\./\.\./\.\./lib/auth-guard'|from '@/lib/auth-guard'|g" "$file"
  sed -i "s|from '\.\./\.\./\.\./\.\./\.\./lib/auth-guard'|from '@/lib/auth-guard'|g" "$file"

  sed -i 's|from "\.\./\.\./\.\./lib/audit-log"|from "@/lib/audit-log"|g' "$file"
  sed -i 's|from "\.\./\.\./\.\./\.\./lib/audit-log"|from "@/lib/audit-log"|g' "$file"
  sed -i 's|from "\.\./\.\./\.\./\.\./\.\./lib/audit-log"|from "@/lib/audit-log"|g' "$file"

  sed -i "s|from '\.\./\.\./\.\./lib/audit-log'|from '@/lib/audit-log'|g" "$file"
  sed -i "s|from '\.\./\.\./\.\./\.\./lib/audit-log'|from '@/lib/audit-log'|g" "$file"
  sed -i "s|from '\.\./\.\./\.\./\.\./\.\./lib/audit-log'|from '@/lib/audit-log'|g" "$file"
done

echo "Import corretti."

echo "==> 2/4 Aggiornamento tsconfig.json"

python3 <<'PY'
import json
from pathlib import Path

path = Path("tsconfig.json")
data = json.loads(path.read_text())

compiler = data.setdefault("compilerOptions", {})
compiler["baseUrl"] = "."
compiler["paths"] = {"@/*": ["./*"]}

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print("tsconfig.json aggiornato.")
PY

echo "==> 3/4 Pulizia build cache"
rm -rf .next
echo ".next eliminata."

echo "==> 4/4 Build produzione"
npm run build

echo "==> Fine. Se la build è passata, il progetto è pronto per il prossimo step."
