import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"
import { requireServerAuth } from "@/lib/auth-guard"

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

    const targa = String(body.targa || "").trim().toUpperCase().replace(/\s+/g, "")
    const marca = String(body.marca || "").trim().toUpperCase()
    const modello = String(body.modello || "").trim().toUpperCase()
    const colore = String(body.colore || "").trim()
    const km = Number(body.km || 0)
    const numeroChiave = Number(body.numeroChiave || 0)
    const note = String(body.note || "").trim()
    const zonaId = String(body.zonaId || "").trim().toUpperCase()
    const operatore = auth.user

    if (!/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(targa)) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        dettaglio: "Formato targa non valido",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Formato targa non valido" },
        { status: 400 }
      )
    }

    if (!zonaId || !ZONE_INFO[zonaId]) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        dettaglio: "Zona non valida",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Zona non valida" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: targaEsistente, error: errTarga } = await supabase
      .from("parco_usato")
      .select("targa")
      .eq("targa", targa)
      .eq("stato", "PRESENTE")
      .limit(1)

    if (errTarga) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        zona_id: zonaId,
        zona_attuale: ZONE_INFO[zonaId],
        dettaglio: "Errore controllo targa esistente",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: errTarga.message },
        { status: 500 }
      )
    }

    if (targaEsistente && targaEsistente.length > 0) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        zona_id: zonaId,
        zona_attuale: ZONE_INFO[zonaId],
        dettaglio: "Targa già presente nel piazzale",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Targa già presente nel piazzale" },
        { status: 400 }
      )
    }

    if (numeroChiave > 0) {
      const { data: chiaveEsistente, error: errChiave } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("numero_chiave", numeroChiave)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (errChiave) {
        await writeAuditLog({
          operatore,
          azione: "INGRESSO_VEICOLO",
          targa,
          numero_chiave: numeroChiave,
          zona_id: zonaId,
          zona_attuale: ZONE_INFO[zonaId],
          dettaglio: "Errore controllo chiave esistente",
          esito: "KO",
        })

        return NextResponse.json(
          { ok: false, error: errChiave.message },
          { status: 500 }
        )
      }

      if (chiaveEsistente && chiaveEsistente.length > 0) {
        await writeAuditLog({
          operatore,
          azione: "INGRESSO_VEICOLO",
          targa,
          numero_chiave: numeroChiave,
          zona_id: zonaId,
          zona_attuale: ZONE_INFO[zonaId],
          dettaglio: `Chiave ${numeroChiave} già occupata dalla vettura ${chiaveEsistente[0].targa}`,
          esito: "KO",
        })

        return NextResponse.json(
          {
            ok: false,
            error: `La chiave ${numeroChiave} è già occupata dalla vettura ${chiaveEsistente[0].targa}`,
          },
          { status: 400 }
        )
      }
    }

    const payload = {
      targa,
      marca_modello: `${marca} ${modello}`.trim(),
      colore,
      km,
      numero_chiave: numeroChiave,
      zona_id: zonaId,
      zona_attuale: ZONE_INFO[zonaId],
      data_ingresso: new Date().toISOString(),
      note,
      stato: "PRESENTE",
      utente_ultimo_invio: operatore,
    }

    const { error: insertError } = await supabase.from("parco_usato").insert(payload)

    if (insertError) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        numero_chiave: numeroChiave,
        zona_id: zonaId,
        zona_attuale: ZONE_INFO[zonaId],
        dettaglio: "Errore inserimento vettura in parco_usato",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    const dettaglio =
      `Ingresso in ${ZONE_INFO[zonaId]} | ` +
      `Chiave: ${numeroChiave === 0 ? "0 - Commerciante" : numeroChiave} | ` +
      `Marca/Modello: ${`${marca} ${modello}`.trim()}`

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Ingresso",
      dettaglio,
      utente: operatore,
      numero_chiave: numeroChiave,
      created_at: now,
    })

    await writeAuditLog({
      operatore,
      azione: "INGRESSO_VEICOLO",
      targa,
      numero_chiave: numeroChiave,
      zona_id: zonaId,
      zona_attuale: ZONE_INFO[zonaId],
      dettaglio,
      esito: "OK",
    })

    return NextResponse.json({
      ok: true,
      message: "Vettura registrata correttamente",
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno ingresso" },
      { status: 500 }
    )
  }
}
