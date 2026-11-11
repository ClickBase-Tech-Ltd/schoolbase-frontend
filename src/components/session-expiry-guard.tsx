"use client";

import { useEffect } from "react";

interface SessionExpiryGuardProps {
  expiresAt?: number;
  loginPath: string;
}

export default function SessionExpiryGuard({
  expiresAt,
  loginPath,
}: SessionExpiryGuardProps) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checking = false;
    let redirecting = false;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
    };

    const redirectToLogin = () => {
      if (redirecting) return;
      redirecting = true;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/api/auth/logout?redirectUrl=${encodeURIComponent(loginPath)}`;
      form.hidden = true;
      document.body.appendChild(form);
      form.submit();
    };

    const scheduleCheck = (expiration?: number) => {
      clearTimer();
      const delay = expiration
        ? expiration * 1000 - Date.now()
        : 60_000;

      timer = setTimeout(checkSession, delay > 0 ? delay : 30_000);
    };

    const checkSession = async () => {
      if (checking || redirecting) return;
      checking = true;

      try {
        const response = await fetch("/api/auth/verify", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        if (!response.ok) {
          timer = setTimeout(checkSession, 30_000);
          return;
        }

        const data = await response.json();
        const expiration = data?.session?.exp ?? data?.user?.exp;
        scheduleCheck(typeof expiration === "number" ? expiration : undefined);
      } catch (error) {
        console.error("[session expiry] Session verification failed:", error);
        timer = setTimeout(checkSession, 30_000);
      } finally {
        checking = false;
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    scheduleCheck(expiresAt);
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenVisible);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenVisible);
    };
  }, [expiresAt, loginPath]);

  return null;
}
