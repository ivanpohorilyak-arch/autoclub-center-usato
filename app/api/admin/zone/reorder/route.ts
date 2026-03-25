import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const auth = requireServerAuth()
  if (!auth.ok) {
    return { ok: false as const, response: auth.response }
  }

  const supabase = getSupabase()

  const { data: profilo, error } = await supabase
    .from("profili")
    .select("ruolo, attivo")
    .eq("id", auth.user)
    .maybeSingle()

  if (
    error ||
    !profilo ||
    !profilo.attivo ||
    String(profilo.ruolo || "").toLowerCase() !== "admin"
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Non autorizzato" },
        { status: 403 }
      ),
    }
  }

  return { ok: true as const, supabase }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { supabase } = guard
    const body = await req.json()

    const id = String(body.id || "").trim().toUpperCase()
    const direction = String(body.direction || "").trim().toLowerCase()

    if (!id || !["up", "down"].includes(direction)) {
      return NextResponse.json(
        { ok: false, error: "Parametri non validi" },
        { status: 400 }
      )
    }

    const { data: zone, error } = await supabase
      .from("zone")
      .select("id, ordine")
      .order("ordine", { ascending: true })
      .order("id", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Errore caricamento zone: " + error.message },
        { status: 500 }
      )
    }

    const rows = zone ?? []
    const index = rows.findIndex((z) => z.id === id)

    if (index === -1) {
      return NextResponse.json(
        { ok: false, error: "Zona non trovata" },
        { status: 404 }
      )
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1

    if (swapIndex < 0 || swapIndex >= rows.length) {
      return NextResponse.json({ ok: true, message: "Nessuno spostamento necessario" })
    }

    const current = rows[index]
    const other = rows[swapIndex]

    const { error: err1 } = await supabase
      .from("zone")
      .update({ ordine: -999999 })
      .eq("id", current.id)

    if (err1) {
      return NextResponse.json(
        { ok: false, error: "Errore riordino zone: " + err1.message },
        { status: 500 }
      )
    }

    const { error: err2 } = await supabase
      .from("zone")
      .update({ ordine: current.ordine })
      .eq("id", other.id)

    if (err2) {
      return NextResponse.json(
        { ok: false, error: "Errore riordino zone: " + err2.message },
        { status: 500 }
      )
    }

    const { error: err3 } = await supabase
      .from("zone")
      .update({ ordine: other.ordine })
      .eq("id", current.id)

    if (err3) {
      return NextResponse.json(
        { ok: false, error: "Errore riordino zone: " + err3.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Ordine aggiornato correttamente",
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore interno server" },
      { status: 500 }
    )
  }
}
