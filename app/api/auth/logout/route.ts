import { NextRequest, NextResponse } from "next/server"
import { writeAuditLog } from "@/lib/audit-log"

export async function POST(req: NextRequest) {
  const operatore = req.cookies.get("autoclub_user")?.value || "Operatore"

  await writeAuditLog({
    operatore,
    azione: "LOGOUT",
    dettaglio: "Uscita dal sistema",
    esito: "OK",
  })

  const response = NextResponse.json({ ok: true })

  response.cookies.set("autoclub_user", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  })

  response.cookies.set("autoclub_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  })

  return response
}
