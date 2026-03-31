export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  const { data, error } = await supabase.rpc("lista_utenti_attivi")

  if (error) {
    return jsonNoCache(
      { utenti: [], error: error.message },
      500
    )
  }

  return jsonNoCache({
    utenti: data || [],
  })
}
