import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireServerAuth } from "@/lib/auth-guard"

const ZONE_INFO: Record<string, string> = {
  Z01: "Deposito N.9",
  Z02: "Deposito N.7",
  Z03: "Deposito N.6 (Lavaggisti)",
  Z04: "Deposito unificato 1 e 2",
  Z05: "Showroom",
  Z06: "Vetture vendute",
  Z07: "Piazzale Lavaggio",
  Z08: "Commercianti senza telo",
  Z09: "Commercianti con telo",
  Z10: "Lavorazioni esterni",
  Z11: "Verso altre sedi",
  Z12: "Deposito N.10",
  Z13: "Deposito N.8",
  Z14: "Esterno (Con o Senza telo Motorsclub)",
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getPeriodRange(periodo: string) {
  const now = new Date()
  const start = new Date(now)

  if (periodo === "oggi") {
    start.setHours(0, 0, 0, 0)
    return { start, end: null as Date | null }
  }

  if (periodo === "ieri") {
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)

    start.setTime(end.getTime())
    start.setDate(start.getDate() - 1)

    return { start, end }
  }

  if (periodo === "ultimi_7_giorni") {
    start.setDate(start.getDate() - 7)
    return { start, end: null as Date | null }
  }

  start.setDate(start.getDate() - 30)
  return { start, end: null as Date | null }
}

function giorniDaData(data: string | null) {
  if (!data) return 0
  const now = new Date().getTime()
  const then = new Date(data).getTime()
  const diff = now - then
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export async function GET(req: NextRequest) {
  const auth = requireServerAuth()
  if (!auth.ok) return auth.response

  try {
    const periodo =
      (req.nextUrl.searchParams.get("periodo") || "oggi").trim().toLowerCase()
    const operatore = (req.nextUrl.searchParams.get("operatore") || "Tutti").trim()

    const { start, end } = getPeriodRange(periodo)
    const supabase = getSupabase()

    const { data: presenti, error: presentiError } = await supabase
      .from("parco_usato")
      .select(
        "targa, marca_modello, numero_chiave, zona_id, zona_attuale, data_ingresso, stato"
      )
      .eq("stato", "PRESENTE")

    if (presentiError) {
      return NextResponse.json(
        { ok: false, error: presentiError.message },
        { status: 500 }
      )
    }

    let logQuery = supabase
      .from("log_movimenti")
      .select("*")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })

    if (end) {
      logQuery = logQuery.lt("created_at", end.toISOString())
    }

    if (operatore !== "Tutti") {
      logQuery = logQuery.eq("utente", operatore)
    }

    const { data: logs, error: logError } = await logQuery

    if (logError) {
      return NextResponse.json(
        { ok: false, error: logError.message },
        { status: 500 }
      )
    }

    const { data: utentiAttivi, error: utentiError } = await supabase
      .from("utenti")
      .select("nome")
      .eq("attivo", true)
      .order("nome", { ascending: true })

    if (utentiError) {
      return NextResponse.json(
        { ok: false, error: utentiError.message },
        { status: 500 }
      )
    }

    const azioni = (logs || []).map((r) => String(r.azione || ""))
    const totPiazzale = (presenti || []).length

    const ingressi = azioni.filter((a) => a === "Ingresso").length
    const spostamenti = azioni.filter((a) => a === "Spostamento").length
    const consegne = azioni.filter((a) => a === "Consegna").length
    const ripristini = azioni.filter((a) => a === "Ripristino").length

    const kpiZone = Object.entries(ZONE_INFO).map(([id, nome]) => {
      let inCount = 0
      let spostCount = 0
      let consegCount = 0

      for (const r of logs || []) {
        const dettaglio = String(r.dettaglio || "")
        if (dettaglio.includes(nome)) {
          if (r.azione === "Ingresso") inCount++
          else if (r.azione === "Spostamento") spostCount++
          else if (r.azione === "Consegna") consegCount++
        }
      }

      const presentiZona = (presenti || []).filter((v) => v.zona_id === id).length

      return {
        zona_id: id,
        zona_nome: nome,
        presenti: presentiZona,
        ingressi: inCount,
        spostamenti: spostCount,
        consegne: consegCount,
      }
    })

    const chiaviOccupateSet = new Set<number>()
    const chiaviMap = new Map<number, string[]>()

    for (const r of presenti || []) {
      const num = Number(r.numero_chiave || 0)

      if (num >= 1 && num <= 520) {
        chiaviOccupateSet.add(num)

        const esistenti = chiaviMap.get(num) || []
        esistenti.push(String(r.targa))
        chiaviMap.set(num, esistenti)
      }
    }

    const chiaviOccupate = chiaviOccupateSet.size
    const chiaviLibere = 520 - chiaviOccupate
    const percentualeOccupazione = Number(
      ((chiaviOccupate / 520) * 100).toFixed(1)
    )

    const duplicati: Array<{ numero_chiave: number; targhe: string[] }> = []

    Array.from(chiaviMap.entries()).forEach(([numero, targhe]) => {
      if (targhe.length > 1) {
        duplicati.push({
          numero_chiave: numero,
          targhe,
        })
      }
    })

    const vettureFerme = (presenti || [])
      .map((v) => {
        const giorni_ferma = giorniDaData(v.data_ingresso)
        return {
          targa: v.targa,
          marca_modello: v.marca_modello,
          numero_chiave: v.numero_chiave,
          zona_id: v.zona_id,
          zona_attuale: v.zona_attuale,
          data_ingresso: v.data_ingresso,
          giorni_ferma,
        }
      })
      .sort((a, b) => b.giorni_ferma - a.giorni_ferma)

    const ferme_7 = vettureFerme.filter((v) => v.giorni_ferma >= 7).length
    const ferme_14 = vettureFerme.filter((v) => v.giorni_ferma >= 14).length
    const ferme_30 = vettureFerme.filter((v) => v.giorni_ferma >= 30).length

    return NextResponse.json({
      ok: true,
      filtri: {
        periodo,
        operatore,
      },
      kpi: {
        totale_piazzale: totPiazzale,
        ingressi,
        spostamenti,
        consegne,
        ripristini,
        operatori_attivi: (utentiAttivi || []).length,
      },
      chiavi: {
        totali: 520,
        occupate: chiaviOccupate,
        libere: chiaviLibere,
        percentuale_occupazione: percentualeOccupazione,
        duplicati,
      },
      ferme: {
        giorni_7: ferme_7,
        giorni_14: ferme_14,
        giorni_30: ferme_30,
        elenco: vettureFerme.slice(0, 30),
      },
      zone: kpiZone,
      operatori: (utentiAttivi || []).map((u) => u.nome),
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Errore interno dashboard." },
      { status: 500 }
    )
  }
}
