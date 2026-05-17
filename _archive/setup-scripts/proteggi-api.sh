#!/bin/bash

echo "Protezione API Autoclub..."

# crea cartella lib se non esiste
mkdir -p lib

echo "Creazione auth-guard..."

cat > lib/auth-guard.ts << 'EOF'
import { cookies } from "next/headers"

export function getServerSessionUser() {
  const cookieStore = cookies()

  const session = cookieStore.get("autoclub_session")?.value
  const user = cookieStore.get("autoclub_user")?.value

  if (!session || !user) {
    return null
  }

  return {
    session,
    user,
  }
}

export function requireServerAuth() {
  const auth = getServerSessionUser()

  if (!auth) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, error: "Non autorizzato." },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true as const,
    user: auth.user,
    session: auth.session,
  }
}
EOF

echo "auth-guard creato."

protect_api () {

FILE=$1
IMPORT_PATH=$2

if [ -f "$FILE" ]; then

echo "Protezione $FILE"

sed -i "1i import { requireServerAuth } from \"$IMPORT_PATH\"" $FILE

sed -i "/export async function/ a\\
  const auth = requireServerAuth()\\
  if (!auth.ok) return auth.response
" $FILE

fi
}

protect_api "app/api/ricerca/route.ts" "../../../lib/auth-guard"
protect_api "app/api/spostamento/route.ts" "../../lib/auth-guard"
protect_api "app/api/veicolo/modifica/route.ts" "../../../../lib/auth-guard"
protect_api "app/api/veicolo/consegna/route.ts" "../../../../lib/auth-guard"
protect_api "app/api/me/route.ts" "../../../lib/auth-guard"

echo "Protezione API completata."

echo "Riavvio consigliato:"
echo "rm -rf .next"
echo "npm run dev -- --hostname 0.0.0.0"
