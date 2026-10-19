import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(req: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const query = new URL(req.url).searchParams.toString();
    const response = await fetch(`${backendUrl}/schoolbase-admin/api/signups/pending${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      // try parse JSON
      try {
        const json = JSON.parse(text);
        return NextResponse.json(json, { status: response.status });
      } catch {
        return NextResponse.json({ error: text || 'Failed to fetch pending signups' }, { status: response.status });
      }
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from backend' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error proxying pending signups:', error);
    return NextResponse.json({ error: 'Failed to fetch pending signups' }, { status: 500 });
  }
}
