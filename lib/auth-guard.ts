import { cookies } from "next/headers"

export function getServerSessionUser() {
  const cookieStore = cookies()

  const session = cookieStore.get("autoclub_session")?.value
  const user = cookieStore.get("autoclub_user")?.value

  if (!session || !user) {
    return null
  }

  return {
    session,
    user,
  }
}

export function requireServerAuth() {
  const auth = getServerSessionUser()

  if (!auth) {
    return {
      ok: false as const,
      response: Response.json(
        {
          ok: false,
          error: "Sessione scaduta. Effettua di nuovo il login.",
          code: "SESSION_EXPIRED",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      ),
    }
  }

  return {
    ok: true as const,
    user: auth.user,
    session: auth.session,
  }
}
