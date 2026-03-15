import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response
  try {
    const body = await req.json()

    const targaOriginale = String(body.targaOriginale || "").trim().toUpperCase()
    const targaNuova = String(body.targaNuova || "").trim().toUpperCase()
    const marca = String(body.marca || "").trim().toUpperCase()
    const modello = String(body.modello || "").trim().toUpperCase()
    const colore = String(body.colore || "").trim()
    const km = Number(body.km || 0)
    const numeroChiave = Number(body.numeroChiave || 0)
    const note = String(body.note || "").trim()

    const operatore = req.cookies.get("autoclub_user")?.value || ""

    if (!operatore) {
      return NextResponse.json({ ok: false, error: "Utente non autenticato" }, { status: 401 })
    }

    if (!targaOriginale) {
      return NextResponse.json({ ok: false, error: "Targa originale mancante" }, { status: 400 })
    }

    if (!marca || !modello || !colore) {
      return NextResponse.json(
        { ok: false, error: "Marca, modello e colore sono obbligatori" },
        { status: 400 }
      )
    }

    if (Number.isNaN(km) || km < 0) {
      return NextResponse.json({ ok: false, error: "KM non valido" }, { status: 400 })
    }

    if (Number.isNaN(numeroChiave) || numeroChiave < 0 || numeroChiave > 520) {
      return NextResponse.json({ ok: false, error: "Numero chiave non valido" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error: userError } = await supabase
      .from("utenti")
      .select("can_modifica_targa")
      .eq("nome", operatore)
      .eq("attivo", true)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ ok: false, error: userError.message }, { status: 500 })
    }

    let targaFinale = targaOriginale

    if (targaNuova && targaNuova !== targaOriginale) {
      if (!user?.can_modifica_targa) {
        return NextResponse.json(
          { ok: false, error: "Non sei autorizzato a modificare la targa" },
          { status: 403 }
        )
      }

      if (!/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(targaNuova)) {
        return NextResponse.json({ ok: false, error: "Nuova targa non valida" }, { status: 400 })
      }

      targaFinale = targaNuova
    }

    if (numeroChiave > 0) {
      const { data: chiaveOccupata, error: chiaveError } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("numero_chiave", numeroChiave)
        .eq("stato", "PRESENTE")
        .neq("targa", targaOriginale)

      if (chiaveError) {
        return NextResponse.json({ ok: false, error: chiaveError.message }, { status: 500 })
      }

      if (chiaveOccupata && chiaveOccupata.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `La chiave ${numeroChiave} è già occupata dalla vettura ${chiaveOccupata[0].targa}`,
          },
          { status: 400 }
        )
      }
    }

    const updatePayload = {
      targa: targaFinale,
      marca_modello: `${marca} ${modello}`.trim(),
      colore,
      km,
      numero_chiave: numeroChiave,
      note,
      utente_ultimo_invio: operatore,
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update(updatePayload)
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    if (targaFinale !== targaOriginale) {
      await supabase
        .from("log_movimenti")
        .update({ targa: targaFinale })
        .eq("targa", targaOriginale)
    }

    await supabase.from("log_movimenti").insert({
      targa: targaFinale,
      azione: "Modifica",
      dettaglio:
        targaFinale !== targaOriginale
          ? `Dati modificati e targa corretta da ${targaOriginale} a ${targaFinale}`
          : "Dati vettura modificati",
      utente: operatore,
      numero_chiave: numeroChiave,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, message: "Vettura modificata correttamente" })
  } catch {
    return NextResponse.json({ ok: false, error: "Errore interno modifica" }, { status: 500 })
  }
}
