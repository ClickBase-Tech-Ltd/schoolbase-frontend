import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${getBackendUrl()}/schoolbase-admin/api/financing/products`, {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
      body: await request.text(),
    });
    const data = await response.json().catch(() => ({ message: "Failed to parse backend response." }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying financing product creation:", error);
    return NextResponse.json({ message: "Failed to contact financing operations." }, { status: 500 });
  }
}
