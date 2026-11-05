import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await params;
    const response = await fetch(
      `${getBackendUrl()}/api/admin/subscription/receipts/${encodeURIComponent(paymentId)}/pdf`,
      {
        headers: { Cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(data ?? { error: "Could not download the subscription receipt." }, { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/pdf",
        "Content-Disposition": response.headers.get("content-disposition") || "attachment; filename=SchoolBase-Receipt.pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not download school subscription receipt:", error);
    return NextResponse.json({ error: "Could not download the subscription receipt." }, { status: 502 });
  }
}
