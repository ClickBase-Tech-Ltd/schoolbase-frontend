import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "100";
    const backendUrl = getBackendUrl();

    const response = await fetch(
      `${backendUrl}/schoolbase-admin/api/subscription-payments?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Cookie: req.headers.get("cookie") || "",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: error || "Failed to fetch subscription payments" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching subscription payments:", error);
    return NextResponse.json({ error: "Failed to fetch subscription payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/schoolbase-admin/api/subscription-payments`, {
      method: "POST",
      headers: {
        Cookie: req.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await req.json()),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Failed to record the subscription payment." }, { status: response.status });
  } catch (error) {
    console.error("Error recording custom subscription payment:", error);
    return NextResponse.json({ message: "Failed to record the subscription payment." }, { status: 502 });
  }
}
