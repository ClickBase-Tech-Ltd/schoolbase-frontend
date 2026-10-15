import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const prefix = '/uploads/';
    const uploadPath = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : '';

    if (!uploadPath) {
      return NextResponse.json({ error: 'Upload path required' }, { status: 400 });
    }

    const backendUrl = new URL(`/uploads/${uploadPath}`, getBackendUrl()).toString();
    const resp = await fetch(backendUrl, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Backend returned ${resp.status}` }, { status: resp.status });
    }

    const body = await resp.arrayBuffer();
    return new NextResponse(body, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[UPLOADS API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch from backend' }, { status: 500 });
  }
}
