import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getBackendUrl()}/api/flutterwave/subscription/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({ plan: body?.plan }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to initialize Flutterwave checkout." }, { status: response.status });
  } catch (error) {
    console.error("Flutterwave subscription initialization proxy failed:", error);
    return NextResponse.json({ error: "Unable to initialize Flutterwave checkout." }, { status: 502 });
  }
}
