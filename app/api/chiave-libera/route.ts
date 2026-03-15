import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
      return NextResponse.json({ error: error.message }, { status: 500 })
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

    return NextResponse.json({ numero: libera })
  } catch {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
