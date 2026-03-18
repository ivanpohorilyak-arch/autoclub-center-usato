import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase.rpc("lista_utenti_attivi")

  if (error) {
    return NextResponse.json(
      { utenti: [], error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  return NextResponse.json(
    { utenti: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  )
}
