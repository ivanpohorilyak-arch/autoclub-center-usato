export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

function jsonNoCache(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const searchParams = req.nextUrl.searchParams

    const q = (searchParams.get("q") || "").trim()
    const operatore = (searchParams.get("operatore") || "").trim()
    const azione = (searchParams.get("azione") || "").trim()
    const zona = (searchParams.get("zona") || "").trim()
    const dettaglio = (searchParams.get("dettaglio") || "").trim()
    const targa = (searchParams.get("targa") || "").trim().toUpperCase()
    const chiave = (searchParams.get("chiave") || "").trim()
    const dataDa = (searchParams.get("data_da") || "").trim()
    const dataA = (searchParams.get("data_a") || "").trim()
    const limit = Number(searchParams.get("limit") || "250")
    const offset = Number(searchParams.get("offset") || "0")

    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 250
    const safeOffset =
      Number.isFinite(offset) && offset >= 0 ? offset : 0

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from("audit_log_sistema")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1)

    if (q) {
      query = query.or(
        `targa.ilike.%${q}%,dettaglio.ilike.%${q}%,azione.ilike.%${q}%,operatore.ilike.%${q}%,zona_id.ilike.%${q}%,zona_attuale.ilike.%${q}%`
      )
    }

    if (operatore) {
      query = query.ilike("operatore", `%${operatore}%`)
    }

    if (azione) {
      query = query.ilike("azione", `%${azione}%`)
    }

    if (zona) {
      query = query.or(`zona_id.ilike.%${zona}%,zona_attuale.ilike.%${zona}%`)
    }

    if (dettaglio) {
      query = query.ilike("dettaglio", `%${dettaglio}%`)
    }

    if (targa) {
      query = query.ilike("targa", `%${targa}%`)
    }

    if (chiave) {
      const numeroChiave = Number(chiave)
      if (!Number.isNaN(numeroChiave)) {
        query = query.eq("numero_chiave", numeroChiave)
      }
    }

    if (dataDa) {
      query = query.gte("created_at", `${dataDa}T00:00:00`)
    }

    if (dataA) {
      query = query.lte("created_at", `${dataA}T23:59:59.999`)
    }

    const { data, error, count } = await query

    if (error) {
      return jsonNoCache(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return jsonNoCache({
      ok: true,
      records: data || [],
      total: count || 0,
      limit: safeLimit,
      offset: safeOffset,
      hasMore: safeOffset + (data?.length || 0) < (count || 0),
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno audit" },
      { status: 500 }
    )
  }
}
