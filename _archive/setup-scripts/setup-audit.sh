#!/bin/bash

echo "================================="
echo " Setup Audit Log Sistema"
echo "================================="

echo "Creazione lib/audit-log.ts"

mkdir -p lib

cat > lib/audit-log.ts << 'EOF'
import { createClient } from "@supabase/supabase-js"

type AuditPayload = {
  operatore?: string
  azione: string
  targa?: string | null
  numero_chiave?: number | null
  zona_id?: string | null
  zona_attuale?: string | null
  dettaglio?: string | null
  esito?: string
  origine?: string
}

export async function writeAuditLog(payload: AuditPayload) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from("audit_log_sistema").insert({
      operatore: payload.operatore || null,
      azione: payload.azione,
      targa: payload.targa || null,
      numero_chiave: payload.numero_chiave ?? null,
      zona_id: payload.zona_id || null,
      zona_attuale: payload.zona_attuale || null,
      dettaglio: payload.dettaglio || null,
      esito: payload.esito || "OK",
      origine: payload.origine || "WEB",
    })
  } catch {
    // audit non deve bloccare il sistema
  }
}
EOF

echo "Creato: lib/audit-log.ts"

echo "Creazione API audit"

mkdir -p app/api/audit

cat > app/api/audit/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "../../../lib/auth-guard"

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim()
    const operatore = (req.nextUrl.searchParams.get("operatore") || "").trim()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from("audit_log_sistema")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (q) {
      query = query.or(\`targa.ilike.%\${q}%,dettaglio.ilike.%\${q}%,azione.ilike.%\${q}%\`)
    }

    if (operatore) {
      query = query.eq("operatore", operatore)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, records: data || [] })
  } catch {
    return NextResponse.json({ ok: false, error: "Errore interno audit" }, { status: 500 })
  }
}
EOF

echo "Creato: app/api/audit/route.ts"

echo ""
echo "================================="
echo "Audit Log base installato"
echo "================================="
echo ""
echo "Prossimo passo:"
echo "aggiungere writeAuditLog nelle API:"
echo ""
echo "login"
echo "logout"
echo "ingresso"
echo "spostamento"
echo "modifica"
echo "consegna"
echo ""
echo "poi riavvia:"
echo ""
echo "rm -rf .next"
echo "npm run dev -- --hostname 0.0.0.0"
echo ""
