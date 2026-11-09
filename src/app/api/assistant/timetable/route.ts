import { getStaffSession } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api-client";
import { getCurrentSchool } from "@/lib/school";
import {
  buildTimetableIntelligenceReply,
  parseTimetableConfigs,
  type TimetableIntent,
} from "@/components/assistant/timetable-intelligence";
import { NextRequest, NextResponse } from "next/server";

const allowedIntents = new Set<TimetableIntent>(["now", "next", "today", "availability"]);

export async function GET(request: NextRequest) {
  const session = await getStaffSession();
  if (!session?.schoolId || !["SCHOOL_ADMIN", "TEACHER"].includes(session.role)) {
    return NextResponse.json({ error: "Timetable answers are not enabled for this role." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const intent = params.get("intent") as TimetableIntent | null;
  const className = params.get("className")?.trim() || null;
  const teacherName = params.get("teacherName")?.trim() || null;
  const subjectName = params.get("subjectName")?.trim() || null;
  const personal = params.get("personal") === "true";
  if (!intent || !allowedIntents.has(intent)
    || (className && className.length > 100)
    || (teacherName && teacherName.length > 100)
    || (subjectName && subjectName.length > 100)) {
    return NextResponse.json({ error: "The timetable request is invalid or too long." }, { status: 400 });
  }

  if (personal && session.role !== "TEACHER") {
    return NextResponse.json({
      reply: "I can’t verify a personal teaching assignment for your current role. Ask about a class or a named teacher instead.",
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  if (intent === "availability") {
    return NextResponse.json({
      reply: buildTimetableIntelligenceReply([], {
        intent,
        className,
        teacherName,
        subjectName,
        personal,
        role: session.role,
        userName: session.name?.trim() || null,
        authenticatedTeacherId: session.role === "TEACHER" ? session.userId : null,
        timezone: null,
        serverNow: "",
      }),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  try {
    const school = await getCurrentSchool();
    if (school.id !== session.schoolId) {
      return NextResponse.json({ error: "The authenticated session's school could not be verified." }, { status: 403 });
    }

    const timezone = typeof school.timezone === "string" ? school.timezone.trim() : "";
    if (!timezone) {
      return NextResponse.json({
        reply: "I can’t check the timetable because the school’s configured timezone is unavailable.",
      }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const apiPath = session.role === "SCHOOL_ADMIN"
      ? "/admin/timetable?status=PUBLISHED"
      : "/teacher/timetable";
    const response = await fetch(buildApiUrl(apiPath), {
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-school-id": session.schoolId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json().catch(() => null) as { configs?: unknown; error?: string } | null;
    const configs = parseTimetableConfigs(payload?.configs);
    if (!response.ok || !configs) {
      console.error("Assistant timetable source request failed:", {
        role: session.role,
        status: response.status,
      });
      return NextResponse.json({
        error: "The published timetable is temporarily unavailable. Please open the Timetable page and try again.",
      }, { status: 502 });
    }

    const serverNow = new Date().toISOString();
    const reply = buildTimetableIntelligenceReply(configs, {
      intent,
      className,
      teacherName,
      subjectName,
      personal,
      role: session.role,
      userName: session.name?.trim() || null,
      authenticatedTeacherId: session.role === "TEACHER" ? session.userId : null,
      timezone,
      serverNow,
    });
    return NextResponse.json(
      { reply },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Assistant timetable query failed:", error);
    return NextResponse.json({
      error: "The published timetable could not be checked. Please try again.",
    }, { status: 503 });
  }
}
