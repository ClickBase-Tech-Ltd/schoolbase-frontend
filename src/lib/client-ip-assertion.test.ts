import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createClientIpAssertion } from './client-ip-assertion';

function requestWithIp(ipAddress?: string) {
  return {
    headers: new Headers(ipAddress ? { 'x-real-ip': ipAddress } : {}),
  } as Parameters<typeof createClientIpAssertion>[0];
}

test('client IP assertion signs valid proxy IPs and ignores malformed values', () => {
  process.env.SESSION_SECRET = 'local-signing-secret-for-test';
  const assertion = createClientIpAssertion(requestWithIp('203.0.113.7'));
  assert.ok(assertion);

  const [payload, signature] = assertion.split('.');
  const expectedSignature = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  assert.equal(signature, expectedSignature);
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).ip, '203.0.113.7');
  assert.equal(createClientIpAssertion(requestWithIp('203.0.113.7, 10.0.0.1')), null);
  assert.equal(createClientIpAssertion(requestWithIp('not-an-ip')), null);
  assert.equal(createClientIpAssertion(requestWithIp()), null);
});
