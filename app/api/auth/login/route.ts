import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { writeAuditLog } from "@/lib/audit-log"

const SESSION_MAX_AGE = 60 * 20

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const nome = String(body?.nome || "").trim()
    const pin = String(body?.pin || "").trim()

    if (!nome || !pin) {
      await writeAuditLog({
        operatore: nome || "Sconosciuto",
        azione: "LOGIN NEGATO",
        dettaglio: "Nome e PIN obbligatori mancanti o incompleti",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Nome e PIN obbligatori." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("utenti")
      .select("nome, pin, attivo")
      .eq("nome", nome)
      .eq("attivo", true)
      .maybeSingle()

    if (error) {
      await writeAuditLog({
        operatore: nome,
        azione: "LOGIN NEGATO",
        dettaglio: "Errore lettura utente",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Errore lettura utente." },
        { status: 500 }
      )
    }

    if (!data) {
      await writeAuditLog({
        operatore: nome,
        azione: "LOGIN NEGATO",
        dettaglio: "Operatore non trovato o non attivo",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Operatore non trovato o non attivo." },
        { status: 401 }
      )
    }

    if (String(data.pin) !== pin) {
      await writeAuditLog({
        operatore: nome,
        azione: "LOGIN NEGATO",
        dettaglio: "PIN non valido",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "PIN non valido." },
        { status: 401 }
      )
    }

    await writeAuditLog({
      operatore: data.nome,
      azione: "LOGIN",
      dettaglio: "Accesso effettuato correttamente",
      esito: "OK",
    })

    const response = NextResponse.json({ ok: true })

    response.cookies.set("autoclub_user", data.nome, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })

    response.cookies.set("autoclub_session", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })

    return response
  } catch {
    await writeAuditLog({
      operatore: "Sconosciuto",
      azione: "LOGIN NEGATO",
      dettaglio: "Errore interno login",
      esito: "KO",
    })

    return NextResponse.json(
      { ok: false, error: "Errore interno login." },
      { status: 500 }
    )
  }
}
