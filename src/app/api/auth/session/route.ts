import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

// Simple in-memory cache: tokens that were just minted are guaranteed valid
// without needing full RSA verification again within a short window.
const recentlyVerified = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    // Quick cache check — skip full crypto verification if we verified this
    // exact token within the last 60 seconds (Firebase ID tokens last 1 hour).
    const cached = recentlyVerified.get(body.token);
    if (!cached || Date.now() - cached > 60_000) {
      const session = await verifyFirebaseToken(body.token);
      if (!session) {
        return NextResponse.json({ error: "Invalid Firebase token." }, { status: 401 });
      }
      recentlyVerified.set(body.token, Date.now());
    }

    // Decode the payload to get expiry without full verification.
    const payload = JSON.parse(
      Buffer.from(body.token.split(".")[1], "base64url").toString()
    ) as { exp?: number };

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, body.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(
        SESSION_MAX_AGE_SECONDS,
        Math.max(1, (payload.exp ?? Date.now() / 1000 + 3600) - Math.floor(Date.now() / 1000))
      ),
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
