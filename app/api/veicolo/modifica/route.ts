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

function isValidTarga(value: string) {
  return /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(value)
}

function getDbConstraintMessage(
  error: { code?: string; message?: string; details?: string } | null,
  targa: string,
  numeroChiave: number
) {
  const message = String(error?.message || "").toLowerCase()
  const details = String(error?.details || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()
  const full = `${code} ${message} ${details}`

  if (
    full.includes("ux_parco_usato_targa_presente") ||
    full.includes("(targa)")
  ) {
    return `La targa ${targa} è già presente in parco.`
  }

  if (
    full.includes("ux_parco_usato_numero_chiave_presente") ||
    full.includes("numero_chiave") ||
    full.includes("(numero_chiave)")
  ) {
    return `La chiave ${numeroChiave} è già occupata da un'altra vettura presente.`
  }

  return null
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()

    const targaOriginale = String(body?.targaOriginale || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")

    const targaNuova = String(body?.targaNuova || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")

    const marca = String(body?.marca || "").trim().toUpperCase()
    const modello = String(body?.modello || "").trim().toUpperCase()
    const colore = String(body?.colore || "").trim()
    const km = Number(body?.km || 0)
    const numeroChiave = Number(body?.numeroChiave || 0)
    const note = String(body?.note || "").trim()

    const operatore = auth.user

    if (!targaOriginale) {
      return jsonNoCache(
        { ok: false, error: "Targa originale mancante" },
        400
      )
    }

    if (!marca || !modello || !colore) {
      return jsonNoCache(
        { ok: false, error: "Marca, modello e colore sono obbligatori" },
        400
      )
    }

    if (!Number.isInteger(km) || km < 0 || km > 1000000) {
      return jsonNoCache(
        { ok: false, error: "KM non valido" },
        400
      )
    }

    if (!Number.isInteger(numeroChiave) || numeroChiave < 0 || numeroChiave > 520) {
      return jsonNoCache(
        { ok: false, error: "Numero chiave non valido" },
        400
      )
    }

    const supabase = getSupabase()

    const { data: user, error: userError } = await supabase
      .from("utenti")
      .select("can_modifica_targa, attivo")
      .eq("nome", operatore)
      .maybeSingle()

    if (userError) {
      await writeAuditLog({
        operatore,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Errore lettura permessi utente",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: userError.message },
        500
      )
    }

    if (!user?.attivo) {
      return jsonNoCache(
        { ok: false, error: "Utente non attivo" },
        403
      )
    }

    const { data: veicoloAttuale, error: veicoloError } = await supabase
      .from("parco_usato")
      .select("targa, marca_modello, colore, km, numero_chiave, note, zona_id, zona_attuale")
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (veicoloError) {
      await writeAuditLog({
        operatore,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Errore ricerca vettura",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: veicoloError.message },
        500
      )
    }

    if (!veicoloAttuale) {
      return jsonNoCache(
        { ok: false, error: "Vettura non trovata" },
        404
      )
    }

    let targaFinale = targaOriginale

    if (targaNuova && targaNuova !== targaOriginale) {
      if (!user.can_modifica_targa) {
        await writeAuditLog({
          operatore,
          azione: "MODIFICA_VEICOLO",
          targa: targaOriginale,
          dettaglio: "Tentativo modifica targa senza autorizzazione",
          esito: "KO",
        })

        return jsonNoCache(
          { ok: false, error: "Non sei autorizzato a modificare la targa" },
          403
        )
      }

      if (!isValidTarga(targaNuova)) {
        return jsonNoCache(
          { ok: false, error: "Nuova targa non valida" },
          400
        )
      }

      const { data: targaDuplicata, error: targaDupError } = await supabase
        .from("parco_usato")
        .select("targa, zona_attuale, zona_id")
        .eq("targa", targaNuova)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (targaDupError) {
        return jsonNoCache(
          { ok: false, error: targaDupError.message },
          500
        )
      }

      if (targaDuplicata && targaDuplicata.length > 0) {
        const record = targaDuplicata[0]
        const doveSiTrova =
          record.zona_attuale || record.zona_id
            ? `già presente in zona ${record.zona_attuale || record.zona_id}`
            : "già presente in parco"

        return jsonNoCache(
          { ok: false, error: `La targa ${targaNuova} è ${doveSiTrova}.` },
          409
        )
      }

      targaFinale = targaNuova
    }

    if (numeroChiave > 0 && numeroChiave !== veicoloAttuale.numero_chiave) {
      const { data: chiaveOccupata, error: chiaveError } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("numero_chiave", numeroChiave)
        .eq("stato", "PRESENTE")
        .neq("targa", targaOriginale)
        .limit(1)

      if (chiaveError) {
        return jsonNoCache(
          { ok: false, error: chiaveError.message },
          500
        )
      }

      if (chiaveOccupata && chiaveOccupata.length > 0) {
        return jsonNoCache(
          {
            ok: false,
            error: `La chiave ${numeroChiave} è già occupata dalla vettura ${chiaveOccupata[0].targa}`,
          },
          409
        )
      }
    }

    const marcaModello = `${marca} ${modello}`.trim()

    const modifiche: string[] = []

    if (targaFinale !== veicoloAttuale.targa) {
      modifiche.push(`Targa: ${veicoloAttuale.targa} → ${targaFinale}`)
    }
    if ((veicoloAttuale.marca_modello || "") !== marcaModello) {
      modifiche.push(`Marca/Modello: ${veicoloAttuale.marca_modello || "-"} → ${marcaModello}`)
    }
    if ((veicoloAttuale.colore || "") !== colore) {
      modifiche.push(`Colore: ${veicoloAttuale.colore || "-"} → ${colore}`)
    }
    if ((veicoloAttuale.km ?? null) !== km) {
      modifiche.push(`KM: ${veicoloAttuale.km ?? "-"} → ${km}`)
    }
    if ((veicoloAttuale.numero_chiave ?? null) !== numeroChiave) {
      modifiche.push(`Chiave: ${veicoloAttuale.numero_chiave ?? "-"} → ${numeroChiave}`)
    }
    if ((veicoloAttuale.note || "") !== note) {
      modifiche.push("Note aggiornate")
    }

    const dettaglio =
      modifiche.length > 0 ? modifiche.join(" | ") : "Nessuna modifica rilevata"

    const updatePayload = {
      targa: targaFinale,
      marca_modello: marcaModello,
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
      const friendlyError = getDbConstraintMessage(
        updateError,
        targaFinale,
        numeroChiave
      )

      await writeAuditLog({
        operatore,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        numero_chiave: numeroChiave,
        zona_id: veicoloAttuale.zona_id ?? null,
        zona_attuale: veicoloAttuale.zona_attuale ?? null,
        dettaglio: friendlyError || "Errore aggiornamento dati vettura",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: friendlyError || updateError.message },
        friendlyError ? 409 : 500
      )
    }

    await supabase.from("log_movimenti").insert({
      targa: targaFinale,
      azione: "Modifica",
      dettaglio,
      utente: operatore,
      numero_chiave: numeroChiave,
      created_at: new Date().toISOString(),
    })

    await writeAuditLog({
      operatore,
      azione: "MODIFICA_VEICOLO",
      targa: targaFinale,
      numero_chiave: numeroChiave,
      zona_id: veicoloAttuale.zona_id ?? null,
      zona_attuale: veicoloAttuale.zona_attuale ?? null,
      dettaglio,
      esito: "OK",
    })

    return jsonNoCache({
      ok: true,
      message: "Vettura modificata correttamente",
    })
  } catch (error) {
    console.error("Errore interno modifica:", error)

    return jsonNoCache(
      { ok: false, error: "Errore interno modifica" },
      500
    )
  }
}
