"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";

type SignupActionResult = { success: true; redirectTo: string } | { success: false; error: string };

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3006";

function getSignupBackendUrl(path: string) {
  return `${BACKEND_URL.replace(/\/+$/, "")}${path}`;
}

/**
 * Request OTP for signup verification
 * This is a server action that calls the backend directly.
 */
export async function requestSignupOtpAction(formData: FormData): Promise<SignupActionResult> {
  try {
    const schoolName = formData.get("schoolName");
    const slug = formData.get("slug");
    const tagline = formData.get("tagline");
    const address = formData.get("address");
    const phone = formData.get("phone");
    const country = formData.get("country");
    const adminName = formData.get("adminName");
    const adminEmail = formData.get("adminEmail");
    const password = formData.get("password");

    if (!schoolName || !slug || !country || !adminName || !adminEmail || !password) {
      throw new Error("Missing required fields");
    }

    const apiUrl = getSignupBackendUrl("/api/trial/request-otp");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName,
        slug,
        tagline,
        address,
        phone,
        country,
        adminName,
        adminEmail,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to request OTP");
    }

    const params = new URLSearchParams({ email: String(adminEmail) });
    return { success: true, redirectTo: `/signup/verify?${params.toString()}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Verify OTP and create school account
 */
export async function verifySignupOtpAction(formData: FormData): Promise<SignupActionResult> {
  try {
    const adminEmail = formData.get("adminEmail");
    const otp = formData.get("otp");
    const cookieStore = await cookies();
    const recoveryCookieName = "schoolbase_signup_recovery";
    const existingRecoveryKey = cookieStore.get(recoveryCookieName)?.value;

    if (!adminEmail || (!otp && !existingRecoveryKey)) {
      throw new Error("Enter your verification code, or resume a verification already started in this browser.");
    }

    if (!existingRecoveryKey) throw new Error("Prepare browser recovery before submitting the verification code.");

    const apiUrl = getSignupBackendUrl("/api/trial/verify-otp");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail,
        otp: otp || "",
        recoveryKey: existingRecoveryKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to verify OTP");
    }

    if (!data.token) throw new Error("Account was created but a session could not be established. Please sign in.");

    const requestHeaders = await headers();
    const host = requestHeaders.get("host") || "";
    const schoolbaseHost = host.includes("schoolbase.live");
    cookieStore.set("schoolbase_session", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !host.includes("localhost"),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      ...(schoolbaseHost ? { domain: ".schoolbase.live" } : {}),
    });
    cookieStore.delete(recoveryCookieName);

    return { success: true, redirectTo: "/admin" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function prepareSignupRecoveryAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
    const recoveryCookieName = "schoolbase_signup_recovery";
    if (cookieStore.get(recoveryCookieName)?.value) return { success: true };

    const host = requestHeaders.get("host") || "";
    const schoolbaseHost = host.includes("schoolbase.live");
    cookieStore.set(recoveryCookieName, randomBytes(32).toString("hex"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !host.includes("localhost"),
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
      ...(schoolbaseHost ? { domain: ".schoolbase.live" } : {}),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function resumeSignupAfterTimeoutAction(formData: FormData): Promise<SignupActionResult> {
  return verifySignupOtpAction(formData);
}
