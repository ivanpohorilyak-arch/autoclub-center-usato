#!/usr/bin/env bash

set -e

echo "==> Correzione definitiva import API"

find app/api -type f -name "route.ts" | while read -r file; do
  echo "Fix: $file"

  python3 - "$file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

replacements = {
    'from "../../../lib/auth-guard"': 'from "@/lib/auth-guard"',
    "from '../../../lib/auth-guard'": "from '@/lib/auth-guard'",
    'from "../../../../lib/auth-guard"': 'from "@/lib/auth-guard"',
    "from '../../../../lib/auth-guard'": "from '@/lib/auth-guard'",
    'from "../../../../../lib/auth-guard"': 'from "@/lib/auth-guard"',
    "from '../../../../../lib/auth-guard'": "from '@/lib/auth-guard'",
    'from "../../lib/auth-guard"': 'from "@/lib/auth-guard"',
    "from '../../lib/auth-guard'": "from '@/lib/auth-guard'",
    'from "../lib/auth-guard"': 'from "@/lib/auth-guard"',
    "from '../lib/auth-guard'": "from '@/lib/auth-guard'",

    'from "../../../lib/audit-log"': 'from "@/lib/audit-log"',
    "from '../../../lib/audit-log'": "from '@/lib/audit-log'",
    'from "../../../../lib/audit-log"': 'from "@/lib/audit-log"',
    "from '../../../../lib/audit-log'": "from '@/lib/audit-log'",
    'from "../../../../../lib/audit-log"': 'from "@/lib/audit-log"',
    "from '../../../../../lib/audit-log'": "from '@/lib/audit-log'",
    'from "../../lib/audit-log"': 'from "@/lib/audit-log"',
    "from '../../lib/audit-log'": "from '@/lib/audit-log'",
    'from "../lib/audit-log"': 'from "@/lib/audit-log"',
    "from '../lib/audit-log'": "from '@/lib/audit-log'",
}

for old, new in replacements.items():
    text = text.replace(old, new)

path.write_text(text)
PY
done

echo "==> Verifica tsconfig alias @"

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

echo "==> Pulizia cache build"
rm -rf .next

echo "==> Build"
npm run build
