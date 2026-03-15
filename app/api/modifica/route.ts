import { requireServerAuth } from "@/lib/auth-guard"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isValidTarga(value: string) {
  return /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(value)
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()

    const targaOriginale = String(body?.targaOriginale || "")
      .trim()
      .toUpperCase()

    const nuovaTarga = String(body?.targa || "")
      .trim()
      .toUpperCase()

    const marca_modello = String(body?.marca_modello || "")
      .trim()
      .toUpperCase()

    const colore = String(body?.colore || "")
      .trim()

    const km = body?.km === "" || body?.km == null ? null : Number(body.km)
    const numero_chiave =
      body?.numero_chiave === "" || body?.numero_chiave == null
        ? null
        : Number(body.numero_chiave)

    const note = String(body?.note || "").trim()

    if (!targaOriginale) {
      return NextResponse.json(
        { ok: false, error: "Targa originale mancante" },
        { status: 400 }
      )
    }

    if (!nuovaTarga) {
      return NextResponse.json(
        { ok: false, error: "Targa obbligatoria" },
        { status: 400 }
      )
    }

    if (!isValidTarga(nuovaTarga)) {
      return NextResponse.json(
        { ok: false, error: "Formato targa non valido" },
        { status: 400 }
      )
    }

    if (!marca_modello) {
      return NextResponse.json(
        { ok: false, error: "Marca / modello obbligatorio" },
        { status: 400 }
      )
    }

    if (!colore) {
      return NextResponse.json(
        { ok: false, error: "Colore obbligatorio" },
        { status: 400 }
      )
    }

    if (numero_chiave != null && (Number.isNaN(numero_chiave) || numero_chiave < 0)) {
      return NextResponse.json(
        { ok: false, error: "Numero chiave non valido" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: utente, error: utenteError } = await supabase
      .from("utenti")
      .select("nome, can_modifica_targa")
      .eq("nome", auth.user)
      .maybeSingle()

    if (utenteError) {
      return NextResponse.json(
        { ok: false, error: utenteError.message },
        { status: 500 }
      )
    }

    const canModificaTarga = Boolean(utente?.can_modifica_targa)

    if (!canModificaTarga && nuovaTarga !== targaOriginale) {
      const now = new Date().toISOString()

      await supabase.from("audit_log_sistema").insert({
        operatore: auth.user,
        azione: "MODIFICA NEGATA",
        targa: targaOriginale,
        numero_chiave: null,
        zona_id: null,
        zona_attuale: null,
        dettaglio: "Tentativo modifica targa senza autorizzazione",
        esito: "KO",
        created_at: now,
      })

      return NextResponse.json(
        { ok: false, error: "Non sei autorizzato a modificare la targa" },
        { status: 403 }
      )
    }

    const { data: veicoloAttuale, error: findError } = await supabase
      .from("parco_usato")
      .select("*")
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")
      .maybeSingle()

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      )
    }

    if (!veicoloAttuale) {
      return NextResponse.json(
        { ok: false, error: "Vettura non trovata" },
        { status: 404 }
      )
    }

    if (nuovaTarga !== targaOriginale) {
      const { data: targaDuplicata, error: targaDupError } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("targa", nuovaTarga)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (targaDupError) {
        return NextResponse.json(
          { ok: false, error: targaDupError.message },
          { status: 500 }
        )
      }

      if (targaDuplicata && targaDuplicata.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Targa già presente nel piazzale" },
          { status: 409 }
        )
      }
    }

    if (
      numero_chiave != null &&
      numero_chiave > 0 &&
      numero_chiave !== veicoloAttuale.numero_chiave
    ) {
      const { data: chiaveDuplicata, error: chiaveDupError } = await supabase
        .from("parco_usato")
        .select("targa")
        .eq("numero_chiave", numero_chiave)
        .eq("stato", "PRESENTE")
        .limit(1)

      if (chiaveDupError) {
        return NextResponse.json(
          { ok: false, error: chiaveDupError.message },
          { status: 500 }
        )
      }

      if (chiaveDuplicata && chiaveDuplicata.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Numero chiave già assegnato a un'altra vettura" },
          { status: 409 }
        )
      }
    }

    const modifiche: string[] = []

    if ((veicoloAttuale.targa || "") !== nuovaTarga) {
      modifiche.push(`Targa: ${veicoloAttuale.targa || "-"} → ${nuovaTarga}`)
    }

    if ((veicoloAttuale.marca_modello || "") !== marca_modello) {
      modifiche.push(
        `Marca/Modello: ${veicoloAttuale.marca_modello || "-"} → ${marca_modello}`
      )
    }

    if ((veicoloAttuale.colore || "") !== colore) {
      modifiche.push(`Colore: ${veicoloAttuale.colore || "-"} → ${colore}`)
    }

    if ((veicoloAttuale.km ?? null) !== (km ?? null)) {
      modifiche.push(`KM: ${veicoloAttuale.km ?? "-"} → ${km ?? "-"}`)
    }

    if ((veicoloAttuale.numero_chiave ?? null) !== (numero_chiave ?? null)) {
      modifiche.push(
        `Chiave: ${veicoloAttuale.numero_chiave ?? "-"} → ${numero_chiave ?? "-"}`
      )
    }

    if ((veicoloAttuale.note || "") !== note) {
      modifiche.push("Note aggiornate")
    }

    const dettaglio =
      modifiche.length > 0 ? modifiche.join(" | ") : "Nessuna modifica rilevata"

    const updatePayload = {
      targa: nuovaTarga,
      marca_modello,
      colore,
      km,
      numero_chiave,
      note,
      utente_ultimo_invio: auth.user,
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update(updatePayload)
      .eq("targa", targaOriginale)
      .eq("stato", "PRESENTE")

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()

    await supabase.from("log_movimenti").insert({
      targa: nuovaTarga,
      azione: "Modifica",
      dettaglio,
      utente: auth.user,
      numero_chiave: numero_chiave ?? 0,
      created_at: now,
    })

    await supabase.from("audit_log_sistema").insert({
      operatore: auth.user,
      azione: "MODIFICA",
      targa: nuovaTarga,
      numero_chiave: numero_chiave ?? 0,
      zona_id: veicoloAttuale.zona_id ?? null,
      zona_attuale: veicoloAttuale.zona_attuale ?? null,
      dettaglio,
      esito: "OK",
      created_at: now,
    })

    return NextResponse.json({
      ok: true,
      message: "Dati aggiornati correttamente",
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno modifica" },
      { status: 500 }
    )
  }
}
