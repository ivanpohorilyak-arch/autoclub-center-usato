import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"
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

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()

    const targa = String(body.targa || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
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

      return jsonNoCache(
        { ok: false, error: "Formato targa non valido" },
        400
      )
    }

    if (!Number.isFinite(km) || !Number.isInteger(km) || km < 0 || km > 1000000) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        dettaglio: `KM non validi: ${String(body.km ?? "")}`,
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "KM non validi" },
        400
      )
    }

    if (
      !Number.isFinite(numeroChiave) ||
      !Number.isInteger(numeroChiave) ||
      numeroChiave < 0 ||
      numeroChiave > 9999
    ) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        dettaglio: `Numero chiave non valido: ${String(body.numeroChiave ?? "")}`,
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Numero chiave non valido" },
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
        azione: "INGRESSO_VEICOLO",
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
        azione: "INGRESSO_VEICOLO",
        targa,
        zona_id: zonaId,
        dettaglio: "Zona non valida",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Zona non valida" },
        400
      )
    }

    const zonaNome = zonaRecord.nome

    const { data: targaEsistente, error: errTarga } = await supabase
      .from("parco_usato")
      .select("targa, stato, zona_attuale, zona_id")
      .eq("targa", targa)
      .limit(1)

    if (errTarga) {
      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        zona_id: zonaId,
        zona_attuale: zonaNome,
        dettaglio: "Errore controllo targa esistente",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: errTarga.message },
        500
      )
    }

    if (targaEsistente && targaEsistente.length > 0) {
      const record = targaEsistente[0]

      const doveSiTrova =
        record.stato === "PRESENTE"
          ? `già presente in parco${
              record.zona_attuale || record.zona_id
                ? ` in zona ${record.zona_attuale || record.zona_id}`
                : ""
            }`
          : record.stato === "CONSEGNATO"
            ? "già presente tra le consegnate"
            : `già presente in archivio con stato ${record.stato || "-"}`

      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        zona_id: zonaId,
        zona_attuale: zonaNome,
        dettaglio: `Tentativo ingresso su targa ${doveSiTrova}`,
        esito: "KO",
      })

      return jsonNoCache(
        {
          ok: false,
          error: `La targa ${targa} è ${doveSiTrova}.`,
        },
        400
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
          zona_attuale: zonaNome,
          dettaglio: "Errore controllo chiave esistente",
          esito: "KO",
        })

        return jsonNoCache(
          { ok: false, error: errChiave.message },
          500
        )
      }

      if (chiaveEsistente && chiaveEsistente.length > 0) {
        await writeAuditLog({
          operatore,
          azione: "INGRESSO_VEICOLO",
          targa,
          numero_chiave: numeroChiave,
          zona_id: zonaId,
          zona_attuale: zonaNome,
          dettaglio: `Chiave ${numeroChiave} già occupata dalla vettura ${chiaveEsistente[0].targa}`,
          esito: "KO",
        })

        return jsonNoCache(
          {
            ok: false,
            error: `La chiave ${numeroChiave} è già occupata dalla vettura ${chiaveEsistente[0].targa}`,
          },
          400
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
      zona_attuale: zonaNome,
      data_ingresso: new Date().toISOString(),
      note,
      stato: "PRESENTE",
      utente_ultimo_invio: operatore,
    }

    const { error: insertError } = await supabase.from("parco_usato").insert(payload)

    if (insertError) {
      console.error("Errore insert parco_usato:", insertError)

      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        numero_chiave: numeroChiave,
        zona_id: zonaId,
        zona_attuale: zonaNome,
        dettaglio: "Errore inserimento vettura in parco_usato",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: insertError.message },
        500
      )
    }

    const now = new Date().toISOString()
    const dettaglio =
      `Ingresso in ${zonaNome} | ` +
      `Chiave: ${numeroChiave === 0 ? "0 - Commerciante" : numeroChiave} | ` +
      `Marca/Modello: ${`${marca} ${modello}`.trim()}`

    const { error: logMovimentiError } = await supabase.from("log_movimenti").insert({
      targa,
      azione: "Ingresso",
      dettaglio,
      utente: operatore,
      numero_chiave: numeroChiave,
      created_at: now,
    })

    if (logMovimentiError) {
      console.error("Errore log_movimenti ingresso:", logMovimentiError)

      await writeAuditLog({
        operatore,
        azione: "INGRESSO_VEICOLO",
        targa,
        numero_chiave: numeroChiave,
        zona_id: zonaId,
        zona_attuale: zonaNome,
        dettaglio: "Errore scrittura log_movimenti dopo inserimento vettura",
        esito: "KO",
      })
    }

    await writeAuditLog({
      operatore,
      azione: "INGRESSO_VEICOLO",
      targa,
      numero_chiave: numeroChiave,
      zona_id: zonaId,
      zona_attuale: zonaNome,
      dettaglio,
      esito: "OK",
    })

    return jsonNoCache({
      ok: true,
      message: "Vettura registrata correttamente",
    })
  } catch (error) {
    console.error("Errore interno ingresso veicolo:", error)

    return jsonNoCache(
      { ok: false, error: "Errore interno ingresso" },
      500
    )
  }
}
