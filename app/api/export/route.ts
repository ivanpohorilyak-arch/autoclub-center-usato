import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function csvEscape(value: unknown) {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]) {
  const headerLine = headers.map(csvEscape).join(",")
  const dataLines = rows.map((row) =>
    headers.map((h) => csvEscape(row[h])).join(",")
  )
  return [headerLine, ...dataLines].join("\n")
}

function getPeriodStart(periodo: string) {
  const now = new Date()
  const start = new Date(now)

  switch (periodo) {
    case "oggi":
      start.setHours(0, 0, 0, 0)
      return start
    case "ultimi_7_giorni":
      start.setDate(start.getDate() - 7)
      return start
    case "ultimi_30_giorni":
      start.setDate(start.getDate() - 30)
      return start
    default:
      start.setDate(start.getDate() - 7)
      return start
  }
}

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const tipo = (req.nextUrl.searchParams.get("tipo") || "").trim()
    const zonaId = (req.nextUrl.searchParams.get("zona_id") || "").trim()
    const periodo = (req.nextUrl.searchParams.get("periodo") || "ultimi_7_giorni").trim()

    const supabase = getSupabase()

    if (tipo === "parco_usato") {
      let query = supabase
        .from("parco_usato")
        .select(
          "targa, marca_modello, colore, km, numero_chiave, zona_id, zona_attuale, data_ingresso, note, utente_ultimo_invio, stato"
        )
        .eq("stato", "PRESENTE")
        .order("targa", { ascending: true })

      if (zonaId && zonaId !== "TUTTE") {
        query = query.eq("zona_id", zonaId)
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      const rows = (data || []).map((r) => ({
        targa: r.targa,
        marca_modello: r.marca_modello,
        colore: r.colore,
        km: r.km,
        numero_chiave: r.numero_chiave,
        zona_id: r.zona_id,
        zona_attuale: r.zona_attuale,
        data_ingresso: r.data_ingresso,
        note: r.note,
        utente_ultimo_invio: r.utente_ultimo_invio,
        stato: r.stato,
      }))

      const headers = [
        "targa",
        "marca_modello",
        "colore",
        "km",
        "numero_chiave",
        "zona_id",
        "zona_attuale",
        "data_ingresso",
        "note",
        "utente_ultimo_invio",
        "stato",
      ]

      const csv = rowsToCsv(headers, rows)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export_parco_usato.csv"`,
        },
      })
    }

    if (tipo === "log_movimenti") {
      const start = getPeriodStart(periodo)

      const { data, error } = await supabase
        .from("log_movimenti")
        .select("created_at, targa, azione, dettaglio, utente, numero_chiave")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      const rows = (data || []).map((r) => ({
        created_at: r.created_at,
        targa: r.targa,
        azione: r.azione,
        dettaglio: r.dettaglio,
        utente: r.utente,
        numero_chiave: r.numero_chiave,
      }))

      const headers = [
        "created_at",
        "targa",
        "azione",
        "dettaglio",
        "utente",
        "numero_chiave",
      ]

      const csv = rowsToCsv(headers, rows)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export_log_movimenti.csv"`,
        },
      })
    }

    if (tipo === "audit_log") {
      const start = getPeriodStart(periodo)

      const { data, error } = await supabase
        .from("audit_log_sistema")
        .select(
          "created_at, operatore, azione, targa, numero_chiave, zona_id, zona_attuale, dettaglio, esito, origine"
        )
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      const rows = (data || []).map((r) => ({
        created_at: r.created_at,
        operatore: r.operatore,
        azione: r.azione,
        targa: r.targa,
        numero_chiave: r.numero_chiave,
        zona_id: r.zona_id,
        zona_attuale: r.zona_attuale,
        dettaglio: r.dettaglio,
        esito: r.esito,
        origine: r.origine,
      }))

      const headers = [
        "created_at",
        "operatore",
        "azione",
        "targa",
        "numero_chiave",
        "zona_id",
        "zona_attuale",
        "dettaglio",
        "esito",
        "origine",
      ]

      const csv = rowsToCsv(headers, rows)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export_audit_log.csv"`,
        },
      })
    }

    return NextResponse.json(
      { ok: false, error: "Tipo export non valido." },
      { status: 400 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno export." },
      { status: 500 }
    )
  }
}
