import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim()
    const operatore = (req.nextUrl.searchParams.get("operatore") || "").trim()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from("audit_log_sistema")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (q) {
      query = query.or(
        `targa.ilike.%${q}%,dettaglio.ilike.%${q}%,azione.ilike.%${q}%`
      )
    }

    if (operatore) {
      query = query.eq("operatore", operatore)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      records: data || [],
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno audit" },
      { status: 500 }
    )
  }
}
