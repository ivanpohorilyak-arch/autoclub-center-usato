import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"

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

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()

    const targa = String(body?.targa || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")

    const zonaId = String(body?.zonaId || "")
      .trim()
      .toUpperCase()

    const operatore = auth.user

    if (!targa) {
      return jsonNoCache(
        { ok: false, error: "Targa mancante" },
        400
      )
    }

    if (!zonaId) {
      return jsonNoCache(
        { ok: false, error: "Scansione QR zona obbligatoria" },
        400
      )
    }

    const supabase = getSupabase()

    const { data: zonaRecord, error: zonaError } = await supabase
      .from("zone")
      .select("id, nome")
      .eq("id", zonaId)
      .eq("attiva", true)
      .maybeSingle()

    if (zonaError) {
      await writeAuditLog({
        operatore,
        azione: "SPOSTAMENTO",
        targa,
        zona_id: zonaId,
        dettaglio: "Errore verifica zona",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Errore verifica zona: " + zonaError.message },
        500
      )
    }

    if (!zonaRecord) {
      await writeAuditLog({
        operatore,
        azione: "SPOSTAMENTO",
        targa,
        zona_id: zonaId,
        dettaglio: "Zona non valida",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Scansione QR zona non valida" },
        400
      )
    }

    const nuovaZona = zonaRecord.nome

    const { data: veicolo, error: findError } = await supabase
      .from("parco_usato")
      .select("targa, zona_id, zona_attuale, numero_chiave")
      .eq("targa", targa)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (findError) {
      await writeAuditLog({
        operatore,
        azione: "SPOSTAMENTO",
        targa,
        zona_id: zonaId,
        zona_attuale: nuovaZona,
        dettaglio: "Errore ricerca vettura",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: findError.message },
        500
      )
    }

    if (!veicolo) {
      await writeAuditLog({
        operatore,
        azione: "SPOSTAMENTO",
        targa,
        zona_id: zonaId,
        zona_attuale: nuovaZona,
        dettaglio: "Vettura non trovata o non presente",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Vettura non trovata" },
        404
      )
    }

    if ((veicolo.zona_id || "").toUpperCase() === zonaId) {
      return jsonNoCache({
        ok: true,
        message: "La vettura si trova già in questa zona",
        nuovaZona,
        zonaId,
      })
    }

    const dettaglio = `Da ${veicolo.zona_attuale || veicolo.zona_id || "-"} a ${nuovaZona}`

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
      await writeAuditLog({
        operatore,
        azione: "SPOSTAMENTO",
        targa,
        numero_chiave: veicolo.numero_chiave ?? 0,
        zona_id: zonaId,
        zona_attuale: nuovaZona,
        dettaglio: "Errore aggiornamento zona vettura",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: updateError.message },
        500
      )
    }

    const now = new Date().toISOString()

    const { error: logError } = await supabase
      .from("log_movimenti")
      .insert({
        targa,
        azione: "Spostamento",
        dettaglio,
        utente: operatore,
        numero_chiave: veicolo.numero_chiave ?? 0,
        created_at: now,
      })

    if (logError) {
      console.error("Errore log_movimenti spostamento:", logError)
    }

    await writeAuditLog({
      operatore,
      azione: "SPOSTAMENTO",
      targa,
      numero_chiave: veicolo.numero_chiave ?? 0,
      zona_id: zonaId,
      zona_attuale: nuovaZona,
      dettaglio,
      esito: "OK",
    })

    return jsonNoCache({
      ok: true,
      message: "Spostamento registrato correttamente",
      nuovaZona,
      zonaId,
    })
  } catch (error) {
    console.error("Errore interno spostamento:", error)

    return jsonNoCache(
      { ok: false, error: "Errore interno spostamento" },
      500
    )
  }
}
