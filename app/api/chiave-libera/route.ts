export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from("parco_usato")
      .select("numero_chiave")
      .eq("stato", "PRESENTE")

    if (error) {
      return jsonNoCache({ error: error.message }, 500)
    }

    const occupate = new Set<number>()

    for (const row of data || []) {
      const num = Number(row.numero_chiave)
      if (num >= 1 && num <= 520) {
        occupate.add(num)
      }
    }

    let libera = 0
    for (let i = 1; i <= 520; i++) {
      if (!occupate.has(i)) {
        libera = i
        break
      }
    }

    return jsonNoCache({ numero: libera })
  } catch {
    return jsonNoCache({ error: "Errore interno" }, 500)
  }
}
