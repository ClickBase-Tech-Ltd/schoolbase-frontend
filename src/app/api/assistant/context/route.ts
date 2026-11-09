import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "An authenticated staff session is required." }, { status: 401 });
  }

  let school: { id?: string; name?: string | null; timezone?: string | null } | null = null;
  if (session.schoolId) {
    try {
      school = await getCurrentSchool();
    } catch (error) {
      console.error("Assistant context could not load the authenticated user's school:", error);
      return NextResponse.json({ error: "Verified school information is temporarily unavailable." }, { status: 503 });
    }

    if (!school || school.id !== session.schoolId) {
      return NextResponse.json({ error: "The authenticated session's school could not be verified." }, { status: 403 });
    }
  }

  return NextResponse.json(
    {
      name: session.name?.trim() || null,
      role: session.role || null,
      schoolName: school?.name?.trim() || null,
      timezone: school?.timezone?.trim() || null,
      serverNow: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
