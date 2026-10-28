import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(request: Request) {
  try {
    const country = new URL(request.url).searchParams.get("country");
    if (!country) {
      return NextResponse.json({ error: "A billing country is required." }, { status: 400 });
    }
    const response = await fetch(
      `${getBackendUrl()}/api/pricing?country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to load pricing." }, { status: 502 });
  }
}
