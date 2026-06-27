import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isProtected = isProtectedPath(pathname);
  const isAuthPage = pathname.startsWith("/auth");

  if (!sessionToken) {
    if (!isProtected) return NextResponse.next();

    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  const session = await verifyFirebaseToken(sessionToken);
  if (!session) {
    const response = isProtected
      ? NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(`${pathname}${search}`)}`, request.url))
      : NextResponse.next();

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-hourglass-user-id", session.uid);
  return response;
}

export const config = {
  matcher: ["/auth", "/dashboard/:path*", "/onboarding"],
};
