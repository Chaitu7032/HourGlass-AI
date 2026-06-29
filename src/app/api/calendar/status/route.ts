import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleCalendarStatus } from "@/lib/calendar/google-calendar";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken || !(await verifyFirebaseToken(sessionToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getGoogleCalendarStatus());
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Unable to read status" },
      { status: 200 }
    );
  }
}
