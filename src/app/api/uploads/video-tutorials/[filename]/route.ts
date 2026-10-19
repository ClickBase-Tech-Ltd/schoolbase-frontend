import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

export const dynamic = 'force-dynamic';

async function proxyVideo(request: Request, context: { params: Promise<{ filename: string }> }, method: 'GET' | 'HEAD') {
  const { filename } = await context.params;
  if (!/^[a-f0-9-]{36}\.mp4$/i.test(filename)) {
    return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  }

  try {
    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('range', range);

    const response = await fetch(`${getBackendUrl()}/uploads/video-tutorials/${encodeURIComponent(filename)}`, {
      method,
      headers,
      cache: 'no-store',
    });
    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: 'Video not found.' }, { status: response.status });
    }

    const forwardedHeaders = new Headers({
      'content-type': response.headers.get('content-type') || 'video/mp4',
      'cache-control': 'public, max-age=86400, immutable',
      'accept-ranges': response.headers.get('accept-ranges') || 'bytes',
      'x-content-type-options': 'nosniff',
    });
    for (const header of ['content-length', 'content-range']) {
      const value = response.headers.get(header);
      if (value) forwardedHeaders.set(header, value);
    }

    return new Response(response.body, { status: response.status, headers: forwardedHeaders });
  } catch (error) {
    console.error('[tutorial video playback proxy] Failed to stream media:', error);
    return NextResponse.json({ error: 'Unable to stream video.' }, { status: 502 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  return proxyVideo(request, context, 'GET');
}

export async function HEAD(request: Request, context: { params: Promise<{ filename: string }> }) {
  return proxyVideo(request, context, 'HEAD');
}
