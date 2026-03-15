import { NextRequest, NextResponse } from "next/server"

function isAuthenticated(req: NextRequest) {
  const session = req.cookies.get("autoclub_session")?.value
  const user = req.cookies.get("autoclub_user")?.value

  return Boolean(session && user)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authenticated = isAuthenticated(req)

  const isLoginPage = pathname === "/login"
  const isProtectedPage =
    pathname === "/home" ||
    pathname === "/ingresso" ||
    pathname === "/ricerca" ||
    pathname === "/dashboard"

  if (isProtectedPage && !authenticated) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoginPage && authenticated) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/home", "/ingresso", "/ricerca", "/dashboard"],
}
