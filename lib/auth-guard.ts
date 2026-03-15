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
        { ok: false, error: "Non autorizzato." },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true as const,
    user: auth.user,
    session: auth.session,
  }
}
