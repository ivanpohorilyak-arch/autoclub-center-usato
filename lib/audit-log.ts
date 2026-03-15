import { createClient } from "@supabase/supabase-js"

type AuditPayload = {
  operatore?: string
  azione: string
  targa?: string | null
  numero_chiave?: number | null
  zona_id?: string | null
  zona_attuale?: string | null
  dettaglio?: string | null
  esito?: string
  origine?: string
}

export async function writeAuditLog(payload: AuditPayload) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from("audit_log_sistema").insert({
      operatore: payload.operatore || null,
      azione: payload.azione,
      targa: payload.targa || null,
      numero_chiave: payload.numero_chiave ?? null,
      zona_id: payload.zona_id || null,
      zona_attuale: payload.zona_attuale || null,
      dettaglio: payload.dettaglio || null,
      esito: payload.esito || "OK",
      origine: payload.origine || "WEB",
    })
  } catch {
    // audit non deve bloccare il sistema
  }
}
