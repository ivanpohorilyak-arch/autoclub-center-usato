export const dynamic = "force-dynamic"

import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const supabase = getSupabase()

    const q = (req.nextUrl.searchParams.get("q") || "").trim().toUpperCase()
    const suggest = req.nextUrl.searchParams.get("suggest") === "true"
    const recent = req.nextUrl.searchParams.get("recent") === "true"

    if (recent) {
      const { data, error } = await supabase
        .from("ricerca_log_operatore")
        .select(
          "id, query, targa, numero_chiave, marca_modello, colore, stato, created_at"
        )
        .eq("operatore", auth.user)
        .order("created_at", { ascending: false })
        .limit(30)

      if (error) {
        return jsonNoCache(
          { ok: false, error: error.message },
          500
        )
      }

      const seen = new Set<string>()
      const recenti = (data || [])
        .filter((item) => {
          const key =
            item.targa ||
            (item.numero_chiave != null
              ? `chiave-${item.numero_chiave}`
              : item.query)

          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .slice(0, 10)

      return jsonNoCache({
        ok: true,
        recenti,
      })
    }

    if (suggest) {
      if (!q) {
        return jsonNoCache({
          ok: true,
          suggerimenti: [],
        })
      }

      const isNumeroChiave = /^[0-9]+$/.test(q)

      if (!isNumeroChiave && q.length < 2) {
        return jsonNoCache({
          ok: true,
          suggerimenti: [],
        })
      }

      let suggestQuery = supabase
        .from("parco_usato")
        .select("targa, marca_modello, colore, numero_chiave, zona_attuale, stato")
        .eq("stato", "PRESENTE")
        .limit(8)

      const { data, error } = isNumeroChiave
        ? await suggestQuery.eq("numero_chiave", Number(q))
        : await suggestQuery.ilike("targa", `%${q}%`)

      if (error) {
        return jsonNoCache(
          { ok: false, error: error.message },
          500
        )
      }

      return jsonNoCache({
        ok: true,
        suggerimenti: data || [],
      })
    }

    if (!q) {
      return jsonNoCache(
        { ok: false, error: "Parametro ricerca mancante" },
        400
      )
    }

    const isNumeroChiave = /^[0-9]+$/.test(q)

    const query = supabase
      .from("parco_usato")
      .select("*")
      .eq("stato", "PRESENTE")
      .limit(1)

    const { data: veicoli, error } = isNumeroChiave
      ? await query.eq("numero_chiave", Number(q))
      : await query.eq("targa", q)

    if (error) {
      return jsonNoCache(
        { ok: false, error: error.message },
        500
      )
    }

    if (!veicoli || veicoli.length === 0) {
      return jsonNoCache(
        { ok: false, error: "Nessuna vettura trovata" },
        404
      )
    }

    const veicolo = veicoli[0]

    const { data: storico, error: storicoError } = await supabase
      .from("log_movimenti")
      .select("azione, dettaglio, utente, numero_chiave, created_at")
      .eq("targa", veicolo.targa)
      .order("created_at", { ascending: false })
      .limit(10)

    if (storicoError) {
      return jsonNoCache(
        { ok: false, error: storicoError.message },
        500
      )
    }

    const { data: utente, error: utenteError } = await supabase
      .from("utenti")
      .select("nome, can_consegna, can_modifica_targa")
      .eq("nome", auth.user)
      .maybeSingle()

    if (utenteError) {
      return jsonNoCache(
        { ok: false, error: utenteError.message },
        500
      )
    }

    await supabase.from("ricerca_log_operatore").insert({
      operatore: auth.user,
      query: q,
      targa: veicolo.targa,
      numero_chiave: veicolo.numero_chiave ?? null,
      marca_modello: veicolo.marca_modello ?? null,
      colore: veicolo.colore ?? null,
      stato: veicolo.stato ?? null,
    })

    return jsonNoCache({
      ok: true,
      veicolo,
      storico: storico ?? [],
      permessi: {
        can_consegna: Boolean(utente?.can_consegna),
        can_modifica_targa: Boolean(utente?.can_modifica_targa),
      },
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno ricerca" },
      500
    )
  }
}
