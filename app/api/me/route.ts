export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

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

export async function GET() {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from("utenti")
      .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
      .eq("nome", auth.user)
      .maybeSingle()

    if (error) {
      return jsonNoCache(
        { ok: false, error: error.message },
        500
      )
    }

    if (!data) {
      return jsonNoCache(
        { ok: false, error: "Utente non trovato." },
        404
      )
    }

    return jsonNoCache({
      ok: true,
      id: data.id,
      nome: data.nome,
      ruolo: data.ruolo,
      attivo: data.attivo,
      can_consegna: data.can_consegna,
      can_modifica_targa: data.can_modifica_targa,
    })
  } catch {
    return jsonNoCache(
      { ok: false, error: "Errore interno utente." },
      500
    )
  }
}
