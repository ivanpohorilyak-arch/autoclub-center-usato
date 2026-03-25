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
    .eq("id", auth.userId)
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

  return { ok: true as const, auth, supabase }
}

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { supabase } = guard

    const { data, error } = await supabase
      .from("zone")
      .select("id, nome, attiva, ordine, created_at")
      .order("ordine", { ascending: true })
      .order("id", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Errore caricamento zone: " + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      zone: data ?? [],
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore interno server" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { supabase } = guard
    const body = await req.json()

    const id = String(body.id || "").trim().toUpperCase()
    const nome = String(body.nome || "").trim()
    const attiva = body.attiva !== false

    if (!/^Z[0-9]{2,3}$/.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Codice zona non valido. Esempio: Z15" },
        { status: 400 }
      )
    }

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Nome zona obbligatorio" },
        { status: 400 }
      )
    }

    const { data: esistente } = await supabase
      .from("zone")
      .select("id")
      .eq("id", id)
      .maybeSingle()

    if (esistente) {
      return NextResponse.json(
        { ok: false, error: "Esiste già una zona con questo codice" },
        { status: 400 }
      )
    }

    const { data: maxRow, error: maxError } = await supabase
      .from("zone")
      .select("ordine")
      .order("ordine", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxError) {
      return NextResponse.json(
        { ok: false, error: "Errore lettura ordine zone: " + maxError.message },
        { status: 500 }
      )
    }

    const nuovoOrdine = Number(maxRow?.ordine || 0) + 1

    const { error: insertError } = await supabase.from("zone").insert({
      id,
      nome,
      attiva,
      ordine: nuovoOrdine,
    })

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: "Errore creazione zona: " + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Zona creata correttamente",
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore interno server" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { supabase } = guard
    const body = await req.json()

    const id = String(body.id || "").trim().toUpperCase()
    const nome = typeof body.nome === "string" ? body.nome.trim() : undefined
    const attiva = typeof body.attiva === "boolean" ? body.attiva : undefined

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID zona obbligatorio" },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {}

    if (nome !== undefined) {
      if (!nome) {
        return NextResponse.json(
          { ok: false, error: "Nome zona non valido" },
          { status: 400 }
        )
      }
      updatePayload.nome = nome
    }

    if (attiva !== undefined) {
      updatePayload.attiva = attiva
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessuna modifica richiesta" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("zone")
      .update(updatePayload)
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Errore aggiornamento zona: " + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: "Zona aggiornata correttamente",
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore interno server" },
      { status: 500 }
    )
  }
}
