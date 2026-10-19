import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-client';

const forwardRequest = async (request: NextRequest, pathSegments: string[]) => {
  try {
    const backendUrl = buildApiUrl(`/admin/fees/${pathSegments.join('/')}${request.nextUrl.search}`);

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key === 'host' || key === 'content-length') {
        return;
      }
      headers.set(key, value);
    });

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      const bodyText = await request.text();
      if (bodyText) {
        init.body = bodyText;
      }
    }

    const response = await fetch(backendUrl, init);
    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);

    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[FEES PROXY] Failed to forward request to backend:', error);
    return NextResponse.json(
      { error: 'Failed to forward fees request to backend', details: String(error) },
      { status: 502 }
    );
  }
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return forwardRequest(request, (await params).path ?? []);
}
