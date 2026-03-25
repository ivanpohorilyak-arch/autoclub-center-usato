import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"
import { GestioneZonePage } from "@/components/zone/gestione-zone-page"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ZonePage() {
  const auth = requireServerAuth()

  if (!auth.ok) {
    redirect("/login")
  }

  const supabase = getSupabase()

  const { data: utente, error } = await supabase
    .from("utenti")
    .select("ruolo, attivo")
    .ilike("nome", `%${auth.user}%`)
    .maybeSingle()

  const isAdmin =
    !error &&
    utente &&
    utente.attivo &&
    String(utente.ruolo || "").trim().toLowerCase() === "admin"

  if (!isAdmin) {
    redirect("/home")
  }

  return <GestioneZonePage />
}
