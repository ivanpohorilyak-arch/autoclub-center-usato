export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function jsonNoCache(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
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
    const zonaId = (req.nextUrl.searchParams.get("zona_id") || "")
      .trim()
      .toUpperCase()

    if (!zonaId) {
      return jsonNoCache(
        { ok: false, error: "Parametro zona_id mancante." },
        400
      )
    }

    const supabase = getSupabase()

    const { data: zona, error: zonaError } = await supabase
      .from("zone")
      .select("id, nome, attiva")
      .eq("id", zonaId)
      .maybeSingle()

    if (zonaError) {
      return jsonNoCache(
        { ok: false, error: zonaError.message },
        500
      )
    }

    if (!zona) {
      return jsonNoCache(
        { ok: false, error: "Zona non trovata." },
        404
      )
    }

    if (!zona.attiva) {
      return jsonNoCache(
        { ok: false, error: "Zona non attiva." },
        400
      )
    }

    const { data, error } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, note"
      )
      .eq("zona_id", zonaId)
      .eq("stato", "PRESENTE")
      .order("targa", { ascending: true })

    if (error) {
      return jsonNoCache(
        { ok: false, error: error.message },
        500
      )
    }

    return jsonNoCache({
      ok: true,
      zona: {
        id: zona.id,
        nome: zona.nome,
      },
      records: data || [],
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno verifica zone." },
      500
    )
  }
}
