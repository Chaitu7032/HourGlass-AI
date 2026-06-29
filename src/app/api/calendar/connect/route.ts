import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, storeOAuthState } from "@/lib/calendar/google-calendar";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken || !(await verifyFirebaseToken(sessionToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomUUID();
  await storeOAuthState(state);
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
