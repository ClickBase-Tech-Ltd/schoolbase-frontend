import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await params;
    const response = await fetch(
      `${getBackendUrl()}/schoolbase-admin/api/subscription-payments/${encodeURIComponent(paymentId)}/receipt`,
      {
        headers: { Cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(data ?? { message: "Could not download the payment receipt." }, { status: response.status });
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
    console.error("Could not download platform subscription receipt:", error);
    return NextResponse.json({ message: "Could not download the payment receipt." }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await params;
    const response = await fetch(
      `${getBackendUrl()}/schoolbase-admin/api/subscription-payments/${encodeURIComponent(paymentId)}/receipt/send`,
      {
        method: "POST",
        headers: { Cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Could not email the payment receipt." }, { status: response.status });
  } catch (error) {
    console.error("Could not email platform subscription receipt:", error);
    return NextResponse.json({ message: "Could not email the payment receipt." }, { status: 502 });
  }
}
