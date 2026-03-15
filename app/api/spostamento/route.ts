import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ZONE_INFO: Record<string, string> = {
  Z01: "Deposito N.9",
  Z02: "Deposito N.7",
  Z03: "Deposito N.6 (Lavaggisti)",
  Z04: "Deposito unificato 1 e 2",
  Z05: "Showroom",
  Z06: "Vetture vendute",
  Z07: "Piazzale Lavaggio",
  Z08: "Commercianti senza telo",
  Z09: "Commercianti con telo",
  Z10: "Lavorazioni esterni",
  Z11: "Verso altre sedi",
  Z12: "Deposito N.10",
  Z13: "Deposito N.8",
  Z14: "Esterno (Con o Senza telo Motorsclub)",
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response
  try {
    const body = await req.json()
    const targa = String(body.targa || "").trim().toUpperCase()
    const zonaId = String(body.zonaId || "").trim().toUpperCase()

    const operatore = req.cookies.get("autoclub_user")?.value || "Operatore"

    if (!targa) {
      return NextResponse.json({ ok: false, error: "Targa mancante" }, { status: 400 })
    }

    if (!zonaId || !ZONE_INFO[zonaId]) {
      return NextResponse.json(
        { ok: false, error: "Scansione QR zona obbligatoria" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: veicolo, error: findError } = await supabase
      .from("parco_usato")
      .select("targa, zona_attuale")
      .eq("targa", targa)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (findError) {
      return NextResponse.json({ ok: false, error: findError.message }, { status: 500 })
    }

    if (!veicolo) {
      return NextResponse.json(
        { ok: false, error: "Vettura non trovata" },
        { status: 404 }
      )
    }

    const nuovaZona = ZONE_INFO[zonaId]

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update({
        zona_id: zonaId,
        zona_attuale: nuovaZona,
        utente_ultimo_invio: operatore,
      })
      .eq("targa", targa)
      .eq("stato", "PRESENTE")

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Spostamento",
      dettaglio: `Da ${veicolo.zona_attuale} a ${nuovaZona}`,
      utente: operatore,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      message: "Spostamento registrato correttamente",
      nuovaZona,
      zonaId,
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Errore interno spostamento" }, { status: 500 })
  }
}
