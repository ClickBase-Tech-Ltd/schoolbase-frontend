import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginForPath, roleCanAccess, roleRequirementForPath } from "@/lib/role-access";

// Unified session cookie for all user types (staff, teachers, parents, admins)
const SESSION_COOKIE = "schoolbase_session";
const SESSION_COOKIE_NAMES = [SESSION_COOKIE, "schoolbase_staff", "staff_session"] as const;

function secret() {
  const key = process.env.SESSION_SECRET?.trim();
  if (!key) {
    throw new Error("SESSION_SECRET is not configured for this frontend deployment");
  }
  return new TextEncoder().encode(key);
}

function getAuthBackendUrl() {
  if (process.env.NODE_ENV === "production") {
    return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://api.schoolbase.live")
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/api$/, "");
  }

  return (process.env.BACKEND_URL || "http://localhost:3006")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}

async function readValidToken(cookieName: string, cookieValue?: string) {
  if (!cookieValue) return null;

  try {
    const response = await fetch(`${getAuthBackendUrl()}/api/auth/verify`, {
      method: "GET",
      headers: { Cookie: `${cookieName}=${cookieValue}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.session || data?.user || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith('/api/') || pathname.startsWith('/schoolbase-admin/api/');
  const requirement = roleRequirementForPath(pathname, request.method);
  const cookie = SESSION_COOKIE_NAMES
    .map((name) => ({ name, value: request.cookies.get(name)?.value }))
    .find((candidate) => candidate.value);
  const session = cookie ? await readValidToken(cookie.name, cookie.value) : null;
  const role = typeof session?.role === 'string' ? session.role : null;
  const impersonationEntry = pathname === '/admin'
    && request.nextUrl.searchParams.has('impersonate')
    && role === 'PLATFORM_ADMIN';

  if (requirement !== null && !session) {
    if (isApiRequest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const login = new URL(loginForPath(pathname), request.url);
    login.searchParams.set('next', pathname);
    const response = NextResponse.redirect(login);
    for (const cookieName of SESSION_COOKIE_NAMES) response.cookies.delete(cookieName);
    return response;
  }

  if (requirement !== null && !roleCanAccess(requirement, role) && !impersonationEntry) {
    if (isApiRequest) return NextResponse.json({ error: 'Forbidden: role is not authorized for this resource' }, { status: 403 });

    const login = new URL(loginForPath(pathname), request.url);
    login.searchParams.set('next', pathname);
    const response = NextResponse.redirect(login);
    for (const cookieName of SESSION_COOKIE_NAMES) response.cookies.delete(cookieName);
    return response;
  }

  // Multi-tenant: detect subdomain and set a `schoolSlug` cookie for server-side resolution.
  try {
    const hostname = request.nextUrl.hostname; // e.g. school1.example.com
    if (hostname && !hostname.startsWith("localhost") && hostname.includes(".")) {
      const parts = hostname.split(".");
      if (parts.length >= 3) {
        const subdomain = parts[0];
        const current = request.cookies.get("schoolSlug")?.value;
        // Prefer a versioned, signed cookie to avoid accidental or malicious tampering.
        const newCookieName = "schoolSlug_v2";
        if (current !== subdomain) {
          // Sign the slug to prevent client-side tampering and set as an httpOnly cookie
          const token = await new SignJWT({ slug: subdomain })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(secret());

          const res = NextResponse.next();
          res.cookies.set(newCookieName, token, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60,
          });
          return res;
        }
      }
    }
  } catch {
    // best-effort; don't block requests
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/accounting/:path*",
    "/schoolbase-admin/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/api/admin/:path*",
    "/api/bursar/:path*",
    "/api/teacher/:path*",
    "/api/parent/:path*",
    "/schoolbase-admin/api/:path*",
  ],
};
