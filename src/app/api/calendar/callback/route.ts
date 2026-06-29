import { NextResponse } from "next/server";
import { persistGoogleCalendarTokens, readOAuthState } from "@/lib/calendar/google-calendar";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?calendar=error&reason=${encodeURIComponent(error)}`, url.origin));
  }

  const expectedState = await readOAuthState();
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?calendar=error&reason=invalid_state", url.origin));
  }

  try {
    await persistGoogleCalendarTokens(code);
    return NextResponse.redirect(new URL("/settings?calendar=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?calendar=error&reason=token_exchange_failed", url.origin));
  }
}
