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

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim()

    if (!q) {
      return NextResponse.json({
        ok: true,
        records: [],
      })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, data_ingresso, note, stato"
      )
      .eq("stato", "CONSEGNATO")
      .or(`targa.ilike.%${q}%,marca_modello.ilike.%${q}%`)
      .order("data_ingresso", { ascending: false })
      .limit(50)

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
      { ok: false, error: "Errore interno ricerca ripristino." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const targa = String(body?.targa || "")
      .trim()
      .toUpperCase()

    if (!targa) {
      return NextResponse.json(
        { ok: false, error: "Targa obbligatoria." },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: veicolo, error: veicoloError } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, colore, km, numero_chiave, zona_attuale, zona_id, data_ingresso, note, stato"
      )
      .eq("targa", targa)
      .eq("stato", "CONSEGNATO")
      .maybeSingle()

    if (veicoloError) {
      return NextResponse.json(
        { ok: false, error: veicoloError.message },
        { status: 500 }
      )
    }

    if (!veicolo) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "RIPRISTINO_VEICOLO",
        targa,
        dettaglio: "Tentativo ripristino su vettura non trovata o non consegnata",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: "Vettura non trovata tra le consegnate." },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from("parco_usato")
      .update({
        stato: "PRESENTE",
        utente_ultimo_invio: auth.user,
      })
      .eq("targa", targa)
      .eq("stato", "CONSEGNATO")

    if (updateError) {
      await writeAuditLog({
        operatore: auth.user,
        azione: "RIPRISTINO_VEICOLO",
        targa,
        zona_id: veicolo.zona_id,
        zona_attuale: veicolo.zona_attuale,
        dettaglio: "Errore durante ripristino vettura",
        esito: "KO",
      })

      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      )
    }

    await supabase.from("log_movimenti").insert({
      targa,
      azione: "Ripristino",
      dettaglio: `Riportata in stock da CONSEGNATO a PRESENTE`,
      utente: auth.user,
      numero_chiave: veicolo.numero_chiave ?? 0,
      created_at: new Date().toISOString(),
    })

    await writeAuditLog({
      operatore: auth.user,
      azione: "RIPRISTINO_VEICOLO",
      targa,
      numero_chiave: veicolo.numero_chiave ?? 0,
      zona_id: veicolo.zona_id,
      zona_attuale: veicolo.zona_attuale,
      dettaglio: `Ripristinata vettura ${veicolo.marca_modello || ""}`.trim(),
      esito: "OK",
    })

    return NextResponse.json({
      ok: true,
      message: "Vettura ripristinata correttamente.",
      veicolo: {
        ...veicolo,
        stato: "PRESENTE",
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno ripristino." },
      { status: 500 }
    )
  }
}
