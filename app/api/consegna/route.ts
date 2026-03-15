import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const targa = String(body?.targa || "").trim().toUpperCase()

    if (!targa) {
      return NextResponse.json(
        { ok: false, error: "Targa mancante" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: utente, error: utenteError } = await supabase
      .from("utenti")
      .select("nome, can_consegna")
      .eq("nome", auth.user)
      .maybeSingle()

    if (utenteError) {
      return NextResponse.json(
        { ok: false, error: utenteError.message },
        { status: 500 }
      )
    }

    if (!utente?.can_consegna) {
      return NextResponse.json(
        { ok: false, error: "Non sei autorizzato alla consegna" },
        { status: 403 }
      )
    }

    const { data: veicolo, error: findError } = await supabase
      .from("parco_usato")
      .select("targa, zona_attuale, numero_chiave")
      .eq("targa", targa)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      )
    }

    if (!veicolo) {
      return NextResponse.json(
        { ok: false, error: "Vettura non trovata" },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update({
        stato: "CONSEGNATO",
        numero_chiave: 0,
        utente_ultimo_invio: auth.user,
      })
      .eq("targa", targa)
      .eq("stato", "PRESENTE")

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      )
    }

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Consegna",
      dettaglio: `Uscita da ${veicolo.zona_attuale || "-"}`,
      utente: auth.user,
      numero_chiave: veicolo.numero_chiave ?? 0,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      message: "Consegna registrata correttamente",
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno consegna" },
      { status: 500 }
    )
  }
}
