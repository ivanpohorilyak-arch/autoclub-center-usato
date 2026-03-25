import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

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
      .ilike("nome", `%${auth.user}%`)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Utente non trovato." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      nome: data.nome,
      ruolo: data.ruolo,
      attivo: data.attivo,
      can_consegna: data.can_consegna,
      can_modifica_targa: data.can_modifica_targa,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno utente." },
      { status: 500 }
    )
  }
}
