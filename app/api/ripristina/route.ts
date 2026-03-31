export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"
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

function getDbConstraintMessage(
  error: { code?: string; message?: string; details?: string } | null,
  targa: string,
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
    return `La targa ${targa} è già presente in parco.`
  }

  if (
    numeroChiave != null &&
    numeroChiave > 0 &&
    (full.includes("ux_parco_usato_numero_chiave_presente") ||
      full.includes("numero_chiave") ||
      full.includes("(numero_chiave)"))
  ) {
    return `La chiave ${numeroChiave} è già occupata da un'altra vettura presente.`
  }

  return null
}

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim()

    if (!q) {
      return jsonNoCache({
        ok: true,
        records: [],
      })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, data_ingresso, note, stato"
      )
      .eq("stato", "CONSEGNATO")
      .or(`targa.ilike.%${q}%,marca_modello.ilike.%${q}%`)
      .order("data_ingresso", { ascending: false })
      .limit(50)

    if (error) {
      return jsonNoCache(
        { ok: false, error: error.message },
        500
      )
    }

    return jsonNoCache({
      ok: true,
      records: data || [],
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno ricerca ripristino." },
      500
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const targa = String(body?.targa || "").trim().toUpperCase().replace(/\s+/g, "")

    if (!targa) {
      return jsonNoCache(
        { ok: false, error: "Targa obbligatoria." },
        400
      )
    }

    const supabase = getSupabase()

    const { data: veicolo, error: veicoloError } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, data_ingresso, note, stato"
      )
      .eq("targa", targa)
      .eq("stato", "CONSEGNATO")
      .maybeSingle()

    if (veicoloError) {
      return jsonNoCache(
        { ok: false, error: veicoloError.message },
        500
      )
    }

    if (!veicolo) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "RIPRISTINO_VEICOLO",
        targa,
        dettaglio: "Tentativo ripristino su vettura non trovata o non in stato CONSEGNATO",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: "Vettura non trovata tra le consegnate." },
        404
      )
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update({
        stato: "PRESENTE",
        utente_ultimo_invio: auth.user,
      })
      .eq("targa", targa)
      .eq("stato", "CONSEGNATO")

    if (updateError) {
      const friendlyError = getDbConstraintMessage(
        updateError,
        targa,
        veicolo.numero_chiave ?? null
      )

      await writeAuditLog({
        operatore: auth.user,
        azione: "RIPRISTINO_VEICOLO",
        targa,
        numero_chiave: veicolo.numero_chiave ?? 0,
        zona_id: veicolo.zona_id,
        zona_attuale: veicolo.zona_attuale,
        dettaglio:
          friendlyError ||
          "Errore durante aggiornamento stato da CONSEGNATO a PRESENTE",
        esito: "KO",
      })

      return jsonNoCache(
        { ok: false, error: friendlyError || updateError.message },
        friendlyError ? 409 : 500
      )
    }

    const dettaglioMovimento =
      `Ripristino da CONSEGNATO a PRESENTE | ` +
      `Zona mantenuta: ${veicolo.zona_attuale || veicolo.zona_id || "-"} | ` +
      `Chiave attuale: ${veicolo.numero_chiave === 0 ? "0 - Commerciante" : veicolo.numero_chiave ?? "-"}`

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Ripristino",
      dettaglio: dettaglioMovimento,
      utente: auth.user,
      numero_chiave: veicolo.numero_chiave ?? 0,
      created_at: new Date().toISOString(),
    })

    const dettaglioAudit =
      `Ripristino veicolo ${veicolo.marca_modello || ""}`.trim() +
      ` | Stato: CONSEGNATO → PRESENTE` +
      ` | Zona: ${veicolo.zona_attuale || veicolo.zona_id || "-"}` +
      ` | Chiave: ${veicolo.numero_chiave === 0 ? "0 - Commerciante" : veicolo.numero_chiave ?? "-"}`

    await writeAuditLog({
      operatore: auth.user,
      azione: "RIPRISTINO_VEICOLO",
      targa,
      numero_chiave: veicolo.numero_chiave ?? 0,
      zona_id: veicolo.zona_id,
      zona_attuale: veicolo.zona_attuale,
      dettaglio: dettaglioAudit,
      esito: "OK",
    })

    return jsonNoCache({
      ok: true,
      message: "Vettura ripristinata correttamente.",
      veicolo: {
        ...veicolo,
        stato: "PRESENTE",
      },
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno ripristino." },
      500
    )
  }
}
