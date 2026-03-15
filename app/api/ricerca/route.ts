import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim().toUpperCase()

    if (!q) {
      return NextResponse.json(
        { ok: false, error: "Parametro ricerca mancante" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const isNumeroChiave = /^[0-9]+$/.test(q)

    const query = supabase
      .from("parco_usato")
      .select("*")
      .eq("stato", "PRESENTE")
      .limit(1)

    const { data: veicoli, error } = isNumeroChiave
      ? await query.eq("numero_chiave", Number(q))
      : await query.eq("targa", q)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!veicoli || veicoli.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessuna vettura trovata" },
        { status: 404 }
      )
    }

    const veicolo = veicoli[0]

    const { data: storico, error: storicoError } = await supabase
      .from("log_movimenti")
      .select("azione, dettaglio, utente, numero_chiave, created_at")
      .eq("targa", veicolo.targa)
      .order("created_at", { ascending: false })
      .limit(10)

    if (storicoError) {
      return NextResponse.json({ ok: false, error: storicoError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      veicolo,
      storico: storico ?? [],
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Errore interno ricerca" }, { status: 500 })
  }
}
