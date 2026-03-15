import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const zonaId = (req.nextUrl.searchParams.get("zona_id") || "").trim()

    if (!zonaId) {
      return NextResponse.json(
        { ok: false, error: "Parametro zona_id mancante." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, note"
      )
      .eq("zona_id", zonaId)
      .eq("stato", "PRESENTE")
      .order("targa", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      records: data || [],
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno verifica zone." },
      { status: 500 }
    )
  }
}
