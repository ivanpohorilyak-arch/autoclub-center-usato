import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("zone")
      .select("id, nome")
      .eq("attiva", true)
      .order("ordine", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      zone: data || [],
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore server" },
      { status: 500 }
    )
  }
}
