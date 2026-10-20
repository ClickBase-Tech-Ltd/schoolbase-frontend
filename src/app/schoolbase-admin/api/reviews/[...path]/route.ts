import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

async function forward(request: NextRequest, params: Promise<{ path?: string[] }>) {
  const { path = [] } = await params;
  const endpoint = `/schoolbase-admin/api/reviews/${path.map(encodeURIComponent).join("/")}`;
  const url = new URL(`${getBackendUrl()}${endpoint}${request.nextUrl.search}`);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key !== "host" && key !== "content-length") headers.set(key, value);
  });
  const init: RequestInit = { method: request.method, headers, redirect: "manual", cache: "no-store" };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();

  try {
    const response = await fetch(url, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("connection");
    return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error("[platform-reviews-proxy] forwarding failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Review service is unavailable." }, { status: 502 });
  }
}

export const GET = (request: NextRequest, context: { params: Promise<{ path?: string[] }> }) => forward(request, context.params);
export const PATCH = (request: NextRequest, context: { params: Promise<{ path?: string[] }> }) => forward(request, context.params);