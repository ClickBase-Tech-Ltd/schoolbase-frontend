import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

async function forwardCountryAdminRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const backendUrl = new URL(
      `/country-admin/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
      getBackendUrl(),
    );
    const headers = new Headers();

    request.headers.forEach((value, key) => {
      if (key === "host" || key === "content-length") return;
      headers.set(key, value);
    });

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const body = await request.arrayBuffer();
      if (body.byteLength > 0) init.body = body;
    }

    const response = await fetch(backendUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("connection");

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[country-admin proxy] Failed to forward request:", error);
    return NextResponse.json({ error: "Failed to forward country-admin request" }, { status: 502 });
  }
}

export const GET = forwardCountryAdminRequest;
export const POST = forwardCountryAdminRequest;
export const PATCH = forwardCountryAdminRequest;
export const OPTIONS = forwardCountryAdminRequest;
