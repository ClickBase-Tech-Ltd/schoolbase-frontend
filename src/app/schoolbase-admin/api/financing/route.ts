import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

async function proxy(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const path = new URL(request.url).pathname.replace(/^\/schoolbase-admin\/api/, "");
    const response = await fetch(`${backendUrl}/schoolbase-admin/api${path}`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ message: "Failed to parse backend response." }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying platform financing request:", error);
    return NextResponse.json({ message: "Failed to contact financing operations." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}
