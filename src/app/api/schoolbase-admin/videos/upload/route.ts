import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const response = await fetch(`${getBackendUrl()}/schoolbase-admin/api/videos/upload`, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
        'x-schoolbase-session': request.headers.get('x-schoolbase-session') || '',
        'content-type': request.headers.get('content-type') || '',
        ...(request.headers.get('content-length') ? { 'content-length': request.headers.get('content-length')! } : {}),
      },
      body: request.body,
      // Stream the upload instead of buffering a potentially large video in Next.js memory.
      // @ts-expect-error Node's fetch requires duplex for a streaming request body.
      duplex: 'half',
      cache: 'no-store',
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('[tutorial video upload proxy] Failed to forward upload:', error);
    return NextResponse.json({ message: 'Unable to reach the SchoolBase video storage server.' }, { status: 502 });
  }
}
