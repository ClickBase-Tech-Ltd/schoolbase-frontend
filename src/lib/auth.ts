import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail, buildSignupVerificationEmail } from "@/lib/email";

export type UserRole = "SCHOOL_ADMIN" | "BURSAR" | "TEACHER" | "STAFF" | "PARENT" | "STUDENT" | "PLATFORM_ADMIN";

const SESSION_COOKIE = "schoolbase_session"; // Unified session cookie for all user types

function secret() {
  const key = process.env.SESSION_SECRET?.trim();
  if (!key) {
    throw new Error("SESSION_SECRET is not configured for this frontend deployment");
  }
  return new TextEncoder().encode(key);
}

export type StaffSession = {
  userId: string;
  schoolId?: string | null;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

export type ParentSession = {
  guardianId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
};

function getSessionTokenFromJar(jar: Awaited<ReturnType<typeof cookies>>): string | undefined {
  return (
    jar.get(SESSION_COOKIE)?.value ||
    jar.get("schoolbase_staff")?.value ||
    jar.get("staff_session")?.value
  );
}

function getAuthBackendUrl() {
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.schoolbase.live')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
}

async function getBackendSession(token: string): Promise<StaffSession | null> {
  try {
    const response = await fetch(`${getAuthBackendUrl()}/api/auth/verify`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const data = await response.json();
    return (data?.session || data?.user || null) as StaffSession | null;
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = getSessionTokenFromJar(jar);
  if (!token) return null;

  const backendSession = await getBackendSession(token);
  if (backendSession) {
    return ['SCHOOL_ADMIN', 'BURSAR', 'TEACHER', 'PLATFORM_ADMIN'].includes(backendSession.role)
      ? backendSession
      : null;
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const session = payload as unknown as StaffSession;
    return ['SCHOOL_ADMIN', 'BURSAR', 'TEACHER', 'PLATFORM_ADMIN'].includes(session.role) ? session : null;
  } catch {
    return null;
  }
}

export async function getPlatformAdminSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const backendSession = await getBackendSession(token);
  if (backendSession?.role === 'PLATFORM_ADMIN') return backendSession;

  try {
    const { payload } = await jwtVerify(token, secret());
    const session = payload as unknown as StaffSession;
    // Only return if role is PLATFORM_ADMIN
    if (session.role === "PLATFORM_ADMIN") {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export async function requirePlatformAdminSession(): Promise<StaffSession> {
  throw new Error("Use GET /api/platform-admin/session instead");
}

export async function getParentSession(): Promise<ParentSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const backendSession = await getBackendSession(token);
  if (backendSession) return backendSession.role === 'PARENT' ? backendSession as unknown as ParentSession : null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === 'PARENT' ? payload as unknown as ParentSession : null;
  } catch {
    return null;
  }
}

export async function destroyStaffSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function destroyParentSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireStaffSession(options?: { allowTrial?: boolean }) {
  throw new Error("Use backend API for session validation instead");
}

export async function createStaffSession(): Promise<void> {
  throw new Error("Use backend API for session creation instead");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const COUNTRY_DIALING_CODE: Record<string, string> = {
  NG: "+234",
  GH: "+233",
  RW: "+250",
};

export function normalizePhone(phone: string, country?: string) {
  const cleaned = phone
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^+\d]/g, "");

  if (!cleaned) return "";
  const normalized = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;
  if (normalized.startsWith("+")) {
    return normalized;
  }

  if (normalized.startsWith("0")) {
    const code = country ? COUNTRY_DIALING_CODE[country.toUpperCase()] : undefined;
    if (code) {
      return `${code}${normalized.slice(1)}`;
    }
  }

  return normalized;
}
