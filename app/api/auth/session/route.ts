import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = cookies()
  const session = cookieStore.get("session")

  if (!session) {
    return NextResponse.json({
      ok: false,
      user: null
    })
  }

  return NextResponse.json({
    ok: true,
    user: session.value
  })
}
