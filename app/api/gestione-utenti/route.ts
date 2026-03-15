import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit-log"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type AdminCheckResult = {
  ok: boolean
  user: string | null
  response: Response | null
}

async function getMeRole(): Promise<AdminCheckResult> {
  const auth = requireServerAuth()

  if (!auth.ok) {
    return {
      ok: false,
      user: null,
      response: auth.response,
    }
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("utenti")
    .select("nome, ruolo, attivo")
    .eq("nome", auth.user)
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Utente non trovato." },
        { status: 404 }
      ),
    }
  }

  if (!data.attivo) {
    return {
      ok: false,
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Utente non attivo." },
        { status: 403 }
      ),
    }
  }

  const isAdmin = String(data.ruolo || "").toLowerCase() === "admin"

  if (!isAdmin) {
    return {
      ok: false,
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Accesso riservato ad admin." },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    user: auth.user,
    response: null,
  }
}

export async function GET() {
  const admin = await getMeRole()
  if (!admin.ok) return admin.response!

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("utenti")
      .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
      .order("nome", { ascending: true })

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
      { ok: false, error: "Errore interno utenti." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const admin = await getMeRole()
  if (!admin.ok) return admin.response!

  try {
    const body = await req.json()

    const nome = String(body?.nome || "").trim()
    const pin = String(body?.pin || "").trim()
    const ruolo = String(body?.ruolo || "operatore").trim().toLowerCase()
    const attivo = Boolean(body?.attivo ?? true)
    const can_consegna = Boolean(body?.can_consegna ?? false)
    const can_modifica_targa = Boolean(body?.can_modifica_targa ?? false)

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Nome obbligatorio." },
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { ok: false, error: "PIN obbligatorio di 4 cifre." },
        { status: 400 }
      )
    }

    if (!["admin", "operatore"].includes(ruolo)) {
      return NextResponse.json(
        { ok: false, error: "Ruolo non valido." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: existing, error: existingError } = await supabase
      .from("utenti")
      .select("id")
      .eq("nome", nome)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Esiste già un utente con questo nome." },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("utenti")
      .insert({
        nome,
        pin,
        ruolo,
        attivo,
        can_consegna,
        can_modifica_targa,
      })
      .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      operatore: admin.user!,
      azione: "CREAZIONE_UTENTE",
      dettaglio: `Creato utente ${nome} con ruolo ${ruolo}`,
      esito: "OK",
    })

    return NextResponse.json({
      ok: true,
      record: data,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno creazione utente." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await getMeRole()
  if (!admin.ok) return admin.response!

  try {
    const body = await req.json()

    const id = Number(body?.id)
    const ruolo = String(body?.ruolo || "operatore").trim().toLowerCase()
    const attivo = Boolean(body?.attivo)
    const can_consegna = Boolean(body?.can_consegna)
    const can_modifica_targa = Boolean(body?.can_modifica_targa)
    const pinRaw = String(body?.pin || "").trim()

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID utente mancante." },
        { status: 400 }
      )
    }

    if (!["admin", "operatore"].includes(ruolo)) {
      return NextResponse.json(
        { ok: false, error: "Ruolo non valido." },
        { status: 400 }
      )
    }

    if (pinRaw && !/^\d{4}$/.test(pinRaw)) {
      return NextResponse.json(
        { ok: false, error: "Il PIN deve essere di 4 cifre." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: target, error: targetError } = await supabase
      .from("utenti")
      .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
      .eq("id", id)
      .maybeSingle()

    if (targetError || !target) {
      return NextResponse.json(
        { ok: false, error: "Utente non trovato." },
        { status: 404 }
      )
    }

    const isSelf = target.nome === admin.user

    const { data: adminsAttivi, error: adminsError } = await supabase
      .from("utenti")
      .select("id, nome")
      .eq("attivo", true)
      .eq("ruolo", "admin")

    if (adminsError) {
      return NextResponse.json(
        { ok: false, error: adminsError.message },
        { status: 500 }
      )
    }

    const totalActiveAdmins = (adminsAttivi || []).length
    const targetIsLastActiveAdmin =
      String(target.ruolo || "").toLowerCase() === "admin" &&
      target.attivo === true &&
      totalActiveAdmins <= 1

    if (isSelf && !attivo) {
      return NextResponse.json(
        { ok: false, error: "Non puoi disattivare te stesso." },
        { status: 400 }
      )
    }

    if (isSelf && ruolo !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Non puoi toglierti il ruolo admin da solo." },
        { status: 400 }
      )
    }

    if (targetIsLastActiveAdmin && (!attivo || ruolo !== "admin")) {
      return NextResponse.json(
        { ok: false, error: "Deve esistere almeno un admin attivo." },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {
      ruolo,
      attivo,
      can_consegna,
      can_modifica_targa,
    }

    if (pinRaw) {
      updatePayload.pin = pinRaw
    }

    const { data: updated, error: updateError } = await supabase
      .from("utenti")
      .update(updatePayload)
      .eq("id", id)
      .select("id, nome, ruolo, attivo, can_consegna, can_modifica_targa")
      .single()

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      operatore: admin.user!,
      azione: "MODIFICA_UTENTE",
      dettaglio: `Modificato utente ${target.nome}`,
      esito: "OK",
    })

    return NextResponse.json({
      ok: true,
      record: updated,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno modifica utente." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getMeRole()
  if (!admin.ok) return admin.response!

  try {
    const id = Number(req.nextUrl.searchParams.get("id") || 0)

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID utente mancante." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: target, error: targetError } = await supabase
      .from("utenti")
      .select("id, nome, ruolo, attivo")
      .eq("id", id)
      .maybeSingle()

    if (targetError || !target) {
      return NextResponse.json(
        { ok: false, error: "Utente non trovato." },
        { status: 404 }
      )
    }

    if (target.nome === admin.user) {
      return NextResponse.json(
        { ok: false, error: "Non puoi eliminare te stesso." },
        { status: 400 }
      )
    }

    const { data: adminsAttivi, error: adminsError } = await supabase
      .from("utenti")
      .select("id")
      .eq("attivo", true)
      .eq("ruolo", "admin")

    if (adminsError) {
      return NextResponse.json(
        { ok: false, error: adminsError.message },
        { status: 500 }
      )
    }

    const totalActiveAdmins = (adminsAttivi || []).length
    const targetIsLastActiveAdmin =
      String(target.ruolo || "").toLowerCase() === "admin" &&
      target.attivo === true &&
      totalActiveAdmins <= 1

    if (targetIsLastActiveAdmin) {
      return NextResponse.json(
        { ok: false, error: "Impossibile eliminare l'ultimo admin attivo." },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from("utenti")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      operatore: admin.user!,
      azione: "ELIMINA_UTENTE",
      dettaglio: `Eliminato utente ${target.nome}`,
      esito: "OK",
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno eliminazione utente." },
      { status: 500 }
    )
  }
}
