import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response
  try {
    const body = await req.json()
    const targa = String(body.targa || "").trim().toUpperCase()
    const operatore = req.cookies.get("autoclub_user")?.value || ""

    if (!operatore) {
      return NextResponse.json({ ok: false, error: "Utente non autenticato" }, { status: 401 })
    }

    if (!targa) {
      return NextResponse.json({ ok: false, error: "Targa mancante" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error: userError } = await supabase
      .from("utenti")
      .select("can_consegna")
      .eq("nome", operatore)
      .eq("attivo", true)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ ok: false, error: userError.message }, { status: 500 })
    }

    if (!user?.can_consegna) {
      return NextResponse.json(
        {
          ok: false,
          error: "Operazione non consentita. Il tuo profilo non è abilitato alla consegna veicoli.",
        },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update({
        stato: "CONSEGNATA",
        zona_attuale: "CONSEGNATA",
        utente_ultimo_invio: operatore,
      })
      .eq("targa", targa)
      .eq("stato", "PRESENTE")

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Consegna",
      dettaglio: "Vettura consegnata",
      utente: operatore,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, message: "Vettura consegnata correttamente" })
  } catch {
    return NextResponse.json({ ok: false, error: "Errore interno consegna" }, { status: 500 })
  }
}
