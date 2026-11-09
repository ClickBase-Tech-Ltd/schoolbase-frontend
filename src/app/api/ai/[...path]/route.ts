import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api-client';

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await getStaffSession();
    if (!session?.schoolId || !['SCHOOL_ADMIN', 'BURSAR'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { path } = await context.params;
    const backendUrl = buildApiUrl(`/ai/${path.join('/')}${request.nextUrl.search}`);
    const headers = new Headers();
    const cookie = request.headers.get('cookie');
    const contentType = request.headers.get('content-type');
    const requestId = request.headers.get('x-request-id');

    if (cookie) headers.set('cookie', cookie);
    if (contentType) headers.set('content-type', contentType);
    if (requestId) headers.set('x-request-id', requestId);

    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });

    const responseBody = await response.arrayBuffer();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('[AI proxy] Failed to forward request:', error);
    return NextResponse.json({ error: 'Failed to forward AI request' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
