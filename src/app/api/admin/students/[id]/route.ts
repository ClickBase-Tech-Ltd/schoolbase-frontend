import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const backendUrl = buildApiUrl(`/admin/students/${id}`);

    const resp = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!resp.ok) {
      const error = await resp.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: `Failed to fetch: ${resp.statusText}` }, { status: resp.status });
    }

    const responseBody = await resp.json();
    return NextResponse.json(responseBody, { status: resp.status });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: `Failed to fetch student: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const backendUrl = buildApiUrl(`/admin/students/${id}`);
    const isJsonRequest = request.headers.get('content-type')?.includes('application/json') ?? false;
    const requestBody = isJsonRequest ? JSON.stringify(await request.json()) : await request.formData();
    const headers: Record<string, string> = {
      cookie: request.headers.get('cookie') || '',
    };
    if (isJsonRequest) headers['Content-Type'] = 'application/json';

    const resp = await fetch(backendUrl, {
      method: 'PATCH',
      headers,
      body: requestBody,
    });

    if (!resp.ok) {
      const error = await resp.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: error || 'Failed to update student' }, { status: resp.status });
    }

    const body = await resp.json();
    return NextResponse.json(body, { status: resp.status });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: `Failed to update student: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
