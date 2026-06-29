import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchCalendarAvailability } from "@/lib/calendar/google-calendar";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken || !(await verifyFirebaseToken(sessionToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rangeStart = url.searchParams.get("rangeStart");
  const rangeEnd = url.searchParams.get("rangeEnd");
  const timezone = url.searchParams.get("timezone") ?? "UTC";

  if (!rangeStart || !rangeEnd) {
    return NextResponse.json({ error: "rangeStart and rangeEnd are required" }, { status: 400 });
  }

  try {
    const availability = await fetchCalendarAvailability(rangeStart, rangeEnd, timezone);
    return NextResponse.json(availability ?? { connected: false });
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Unable to fetch availability" },
      { status: 200 }
    );
  }
}
