import { NextResponse } from "next/server";

function resolveAppUrl(request: Request, fallback = "http://localhost:3000") {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (origin) {
    return origin;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amountMinor, currency, email, name, phone, plan, schoolName, slug, redirectUrl, isSubscription } = body || {};

    if (isSubscription === true) {
      return NextResponse.json(
        { error: "Flutterwave subscription checkout is not enabled for any billing market." },
        { status: 409 },
      );
    }

    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedSchoolName = typeof schoolName === "string" ? schoolName.trim() : "";
    const normalizedCurrency = (typeof currency === "string" ? currency.trim().toUpperCase() : "NGN") || "NGN";
    const normalizedAmountMinor = Number(amountMinor);
    const amount = Number.isFinite(normalizedAmountMinor) ? normalizedAmountMinor / 100 : NaN;

    if (!normalizedAmountMinor || !normalizedEmail || !normalizedName || !normalizedSchoolName || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid checkout details." }, { status: 400 });
    }

    const resolvedRedirectUrl =
      typeof redirectUrl === "string" && redirectUrl.trim()
        ? redirectUrl.trim()
        : `${resolveAppUrl(request)}${isSubscription ? "/admin/subscription-success" : "/purchase/success"}`;

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
    if (!secretKey) {
      return NextResponse.json({ error: "Flutterwave is not configured on this server." }, { status: 500 });
    }

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: normalizedCurrency,
        email: normalizedEmail,
        tx_ref: `schoolbase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        redirect_url: resolvedRedirectUrl,
        customer: {
          email: normalizedEmail,
          phone_number: typeof phone === "string" && phone.trim() ? phone.trim() : "",
          name: normalizedName,
        },
        customizations: {
          title: "SchoolBase Subscription",
          description: `${normalizedSchoolName} • ${plan ?? "plan"}`,
        },
        meta: {
          schoolName: normalizedSchoolName,
          slug: typeof slug === "string" ? slug : "",
          plan: plan ?? "",
          isSubscription: Boolean(isSubscription),
        },
      }),
    });

    const responseText = await response.text();
    let data: { message?: string; error?: string; data?: { link?: string } } | null = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = null;
    }

    if (!response.ok || !data?.data?.link) {
      console.error("Flutterwave init failed", {
        status: response.status,
        providerMessage: data?.message || data?.error || responseText,
        redirectUrl: resolvedRedirectUrl,
        currency: normalizedCurrency,
        amountMinor: normalizedAmountMinor,
      });

      return NextResponse.json(
        {
          error: data?.message || data?.error || "Unable to initialize Flutterwave payment.",
          details: responseText,
          status: response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ authorization_url: data.data.link });
  } catch (error) {
    console.error("Flutterwave init failed:", error);
    return NextResponse.json({ error: "Unable to start Flutterwave checkout." }, { status: 500 });
  }
}
