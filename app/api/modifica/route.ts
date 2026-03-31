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
  nuovaTarga: string,
  numeroChiave: number | null
) {
  const message = String(error?.message || "").toLowerCase()
  const details = String(error?.details || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()

  const full = `${code} ${message} ${details}`

  if (
    full.includes("ux_parco_usato_targa_presente") ||
    full.includes("(targa)")
  ) {
    return `La targa ${nuovaTarga} è già presente in parco.`
  }

  if (
    numeroChiave != null &&
    full.includes("ux_parco_usato_numero_chiave_presente")
  ) {
    return `La chiave ${numeroChiave} è già occupata da un'altra vettura presente.`
  }

  if (
    numeroChiave != null &&
    (full.includes("numero_chiave") || full.includes("(numero_chiave)"))
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

    const nuovaTarga = String(body?.targa || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")

    const marca_modello = String(body?.marca_modello || "")
      .trim()
      .toUpperCase()

    const colore = String(body?.colore || "").trim()

    const km =
      body?.km === "" || body?.km == null ? null : Number(body.km)

    const numero_chiave =
      body?.numero_chiave === "" || body?.numero_chiave == null
        ? null
        : Number(body.numero_chiave)

    const note = String(body?.note || "").trim()

    if (!targaOriginale) {
      return jsonNoCache(
        { ok: false, error: "Targa originale mancante" },
        400
      )
    }

    if (!nuovaTarga) {
      return jsonNoCache(
        { ok: false, error: "Targa obbligatoria" },
        400
      )
    }

    if (!isValidTarga(nuovaTarga)) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Formato targa non valido",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Formato targa non valido" },
        400
      )
    }

    if (!marca_modello) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Marca / modello obbligatorio mancante",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Marca / modello obbligatorio" },
        400
      )
    }

    if (!colore) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Colore obbligatorio mancante",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Colore obbligatorio" },
        400
      )
    }

    if (
      km != null &&
      (!Number.isInteger(km) || km < 0 || km > 1000000)
    ) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "KM non validi",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "KM non validi" },
        400
      )
    }

    if (
      numero_chiave != null &&
      (!Number.isInteger(numero_chiave) ||
        numero_chiave < 0 ||
        numero_chiave > 9999)
    ) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Numero chiave non valido",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Numero chiave non valido" },
        400
      )
    }

    const supabase = getSupabase()

    const { data: utente, error: utenteError } = await supabase
      .from("utenti")
      .select("nome, can_modifica_targa")
      .eq("nome", auth.user)
      .maybeSingle()

    if (utenteError) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Errore lettura permessi utente",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: utenteError.message },
        500
      )
    }

    const canModificaTarga = Boolean(utente?.can_modifica_targa)

    if (!canModificaTarga && nuovaTarga !== targaOriginale) {
      await writeAuditLog({
        operatore: auth.user,
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

    const { data: veicoloAttuale, error: findError } = await supabase
      .from("parco_usato")
      .select("*")
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (findError) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Errore ricerca vettura",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: findError.message },
        500
      )
    }

    if (!veicoloAttuale) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        dettaglio: "Vettura non trovata o non presente",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Vettura non trovata" },
        404
      )
    }

    if (nuovaTarga !== targaOriginale) {
      const { data: targaDuplicata, error: targaDupError } = await supabase
        .from("parco_usato")
        .select("targa, zona_attuale, zona_id")
        .eq("targa", nuovaTarga)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (targaDupError) {
        await writeAuditLog({
          operatore: auth.user,
          azione: "MODIFICA_VEICOLO",
          targa: targaOriginale,
          dettaglio: "Errore controllo duplicato targa",
          esito: "KO",
        })

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

        await writeAuditLog({
          operatore: auth.user,
          azione: "MODIFICA_VEICOLO",
          targa: targaOriginale,
          dettaglio: `Tentativo modifica targa → ${nuovaTarga} (${doveSiTrova})`,
          esito: "KO",
        })

        return jsonNoCache(
          {
            ok: false,
            error: `La targa ${nuovaTarga} è ${doveSiTrova}.`,
          },
          409
        )
      }
    }

    if (
      numero_chiave != null &&
      numero_chiave > 0 &&
      numero_chiave !== veicoloAttuale.numero_chiave
    ) {
      const { data: chiaveDuplicata, error: chiaveDupError } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("numero_chiave", numero_chiave)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (chiaveDupError) {
        await writeAuditLog({
          operatore: auth.user,
          azione: "MODIFICA_VEICOLO",
          targa: targaOriginale,
          numero_chiave,
          dettaglio: "Errore controllo duplicato numero chiave",
          esito: "KO",
        })

        return jsonNoCache(
          { ok: false, error: chiaveDupError.message },
          500
        )
      }

      if (chiaveDuplicata && chiaveDuplicata.length > 0) {
        await writeAuditLog({
          operatore: auth.user,
          azione: "MODIFICA_VEICOLO",
          targa: targaOriginale,
          numero_chiave,
          dettaglio: `Numero chiave già assegnato a un'altra vettura: ${chiaveDuplicata[0].targa}`,
          esito: "KO",
        })

        return jsonNoCache(
          {
            ok: false,
            error: `La chiave ${numero_chiave} è già assegnata alla vettura ${chiaveDuplicata[0].targa}`,
          },
          409
        )
      }
    }

    const modifiche: string[] = []

    if ((veicoloAttuale.targa || "") !== nuovaTarga) {
      modifiche.push(`Targa: ${veicoloAttuale.targa || "-"} → ${nuovaTarga}`)
    }

    if ((veicoloAttuale.marca_modello || "") !== marca_modello) {
      modifiche.push(
        `Marca/Modello: ${veicoloAttuale.marca_modello || "-"} → ${marca_modello}`
      )
    }

    if ((veicoloAttuale.colore || "") !== colore) {
      modifiche.push(`Colore: ${veicoloAttuale.colore || "-"} → ${colore}`)
    }

    if ((veicoloAttuale.km ?? null) !== (km ?? null)) {
      modifiche.push(`KM: ${veicoloAttuale.km ?? "-"} → ${km ?? "-"}`)
    }

    if ((veicoloAttuale.numero_chiave ?? null) !== (numero_chiave ?? null)) {
      modifiche.push(
        `Chiave: ${veicoloAttuale.numero_chiave ?? "-"} → ${numero_chiave ?? "-"}`
      )
    }

    if ((veicoloAttuale.note || "") !== note) {
      modifiche.push("Note aggiornate")
    }

    const dettaglio =
      modifiche.length > 0 ? modifiche.join(" | ") : "Nessuna modifica rilevata"

    const updatePayload = {
      targa: nuovaTarga,
      marca_modello,
      colore,
      km,
      numero_chiave,
      note,
      utente_ultimo_invio: auth.user,
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update(updatePayload)
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")

    if (updateError) {
      const friendlyError = getDbConstraintMessage(
        updateError,
        nuovaTarga,
        numero_chiave
      )

      await writeAuditLog({
        operatore: auth.user,
        azione: "MODIFICA_VEICOLO",
        targa: targaOriginale,
        numero_chiave: numero_chiave ?? veicoloAttuale.numero_chiave ?? 0,
        zona_id: veicoloAttuale.zona_id ?? null,
        zona_attuale: veicoloAttuale.zona_attuale ?? null,
        dettaglio: friendlyError || "Errore aggiornamento dati vettura",
        esito: "KO",
      })

      return jsonNoCache(
        {
          ok: false,
          error: friendlyError || updateError.message,
        },
        friendlyError ? 409 : 500
      )
    }

    const now = new Date().toISOString()

    const { error: logError } = await supabase.from("log_movimenti").insert({
      targa: nuovaTarga,
      azione: "Modifica",
      dettaglio,
      utente: auth.user,
      numero_chiave: numero_chiave ?? 0,
      created_at: now,
    })

    if (logError) {
      console.error("Errore log_movimenti:", logError)
    }

    await writeAuditLog({
      operatore: auth.user,
      azione: "MODIFICA_VEICOLO",
      targa: nuovaTarga,
      numero_chiave: numero_chiave ?? 0,
      zona_id: veicoloAttuale.zona_id ?? null,
      zona_attuale: veicoloAttuale.zona_attuale ?? null,
      dettaglio,
      esito: "OK",
    })

    return jsonNoCache({
      ok: true,
      message: "Dati aggiornati correttamente",
    })
  } catch (error) {
    console.error("Errore interno modifica veicolo:", error)

    await writeAuditLog({
      operatore: auth.user || "Sconosciuto",
      azione: "MODIFICA_VEICOLO",
      dettaglio: "Errore interno modifica",
      esito: "KO",
    })

    return jsonNoCache(
      { ok: false, error: "Errore interno modifica" },
      500
    )
  }
}
