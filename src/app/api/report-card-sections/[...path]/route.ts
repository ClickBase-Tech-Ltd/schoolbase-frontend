import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-client';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(request: NextRequest, { params }: RouteContext) {
  try {
    const { path } = await params;
    const endpoint = `/report-card-sections/${path.map(encodeURIComponent).join('/')}`;
    const backendUrl = new URL(buildApiUrl(endpoint));
    backendUrl.search = request.nextUrl.search;

    const headers = new Headers();
    const cookie = request.headers.get('cookie');
    const contentType = request.headers.get('content-type');
    if (cookie) headers.set('cookie', cookie);
    if (contentType) headers.set('content-type', contentType);

    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
      cache: 'no-store',
    });

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[report-card-sections proxy] Failed to forward request:', error);
    return NextResponse.json({ error: 'Failed to forward report-card sections request' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
