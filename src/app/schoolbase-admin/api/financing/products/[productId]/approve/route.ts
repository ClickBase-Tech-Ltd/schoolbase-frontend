import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await context.params;
    const response = await fetch(
      `${getBackendUrl()}/schoolbase-admin/api/financing/products/${encodeURIComponent(productId)}/approve`,
      {
        method: "POST",
        headers: {
          Cookie: request.headers.get("cookie") || "",
          "Content-Type": "application/json",
        },
        body: await request.text(),
      },
    );
    const data = await response.json().catch(() => ({ message: "Failed to parse backend response." }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying financing product approval:", error);
    return NextResponse.json({ message: "Failed to contact financing operations." }, { status: 500 });
  }
}
