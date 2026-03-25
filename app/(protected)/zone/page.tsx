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

  const { data: profilo, error } = await supabase
    .from("profili")
    .select("ruolo, attivo")
    .eq("id", auth.user)
    .maybeSingle()

  const isAdmin =
    !error &&
    profilo &&
    profilo.attivo &&
    String(profilo.ruolo || "").toLowerCase() === "admin"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  return <GestioneZonePage />
}
