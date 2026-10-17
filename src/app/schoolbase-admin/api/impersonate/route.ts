import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

const SESSION_COOKIE_NAME = "schoolbase_session";
const LEGACY_SESSION_COOKIE_NAMES = ["schoolbase_staff", "staff_session", "schoolbase_parent"];

function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    ...(isProduction ? { domain: ".schoolbase.live" } : {}),
  } as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedSchoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";
    if (!requestedSchoolId) {
      return NextResponse.json({ message: "A school ID is required." }, { status: 400 });
    }

    const backendUrl = getBackendUrl();

    const tokenResponse = await fetch(
      `${backendUrl}/schoolbase-admin/api/impersonate`,
      {
        method: "POST",
        headers: {
          "Cookie": req.headers.get("cookie") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const handoff = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      return NextResponse.json(handoff, { status: tokenResponse.status });
    }

    if (typeof handoff.token !== "string" || !handoff.token) {
      return NextResponse.json({ message: "Impersonation token response was invalid." }, { status: 502 });
    }

    const exchangeResponse = await fetch(`${backendUrl}/api/admin/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: handoff.token }),
      cache: "no-store",
    });
    const exchange = await exchangeResponse.json().catch(() => ({}));

    if (!exchangeResponse.ok
      || exchange.success !== true
      || typeof exchange.token !== "string"
      || exchange.schoolId !== requestedSchoolId) {
      return NextResponse.json(
        {
          message: exchange.message || exchange.error || "Impersonation session exchange failed.",
          stage: "session-exchange",
        },
        { status: exchangeResponse.ok ? 502 : exchangeResponse.status },
      );
    }

    const verificationResponse = await fetch(`${backendUrl}/api/auth/verify`, {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${exchange.token}` },
      cache: "no-store",
    });
    const verification = await verificationResponse.json().catch(() => ({}));
    const verifiedSession = verification.session || verification.user;
    if (!verificationResponse.ok
      || verification.authenticated !== true
      || verifiedSession?.role !== "SCHOOL_ADMIN"
      || verifiedSession?.schoolId !== requestedSchoolId) {
      return NextResponse.json(
        { message: "The backend rejected the impersonated school session.", stage: "session-verification" },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      success: true,
      schoolId: exchange.schoolId,
      redirectUrl: "/admin",
    });
    const cookieOptions = getSessionCookieOptions();
    for (const legacyCookieName of LEGACY_SESSION_COOKIE_NAMES) {
      response.cookies.set(legacyCookieName, "", { ...cookieOptions, maxAge: 0 });
    }
    response.cookies.set(SESSION_COOKIE_NAME, exchange.token, {
      ...cookieOptions,
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error impersonating school:", error);
    return NextResponse.json({
      message: "Impersonation failed before the school session was established.",
      stage: "proxy",
    }, { status: 500 });
  }
}
