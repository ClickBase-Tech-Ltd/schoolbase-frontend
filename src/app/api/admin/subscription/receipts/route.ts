import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${getBackendUrl()}/api/admin/subscription/receipts`, {
      headers: { Cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Could not load subscription receipts." }, { status: response.status });
  } catch (error) {
    console.error("Could not load school subscription receipts:", error);
    return NextResponse.json({ error: "Could not load subscription receipts." }, { status: 502 });
  }
}
