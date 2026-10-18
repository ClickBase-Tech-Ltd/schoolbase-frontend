import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { NextRequest } from 'next/server';

export function createClientIpAssertion(request: NextRequest): string | null {
  const ipAddress = request.headers.get('x-real-ip')?.trim();
  const secret = process.env.SESSION_SECRET?.trim();
  if (!ipAddress || !secret || isIP(ipAddress) === 0) return null;

  const payload = Buffer.from(JSON.stringify({ ip: ipAddress, timestamp: Date.now() })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
