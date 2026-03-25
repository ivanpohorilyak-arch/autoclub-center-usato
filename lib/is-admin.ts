import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAdminGuard() {
  const auth = requireServerAuth()

  if (!auth.ok) {
    return {
      ok: false as const,
      response: auth.response,
    }
  }

  const supabase = getSupabase()

  const { data: profilo, error } = await supabase
    .from("utenti")
    .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
    .eq("nome", auth.user)
    .maybeSingle()

  if (error || !profilo || !profilo.attivo) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Utente non autorizzato" },
        { status: 403 }
      ),
    }
  }

  const isAdmin = String(profilo.ruolo || "").trim().toLowerCase() === "admin"

  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Non autorizzato" },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true as const,
    auth,
    supabase,
    utente: profilo,
  }
}
