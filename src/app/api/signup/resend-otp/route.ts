import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getBackendUrl()}/api/trial/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: body.adminEmail }),
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Unable to resend the verification code right now.' }, { status: 503 });
  }
}