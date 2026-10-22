import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin, externalRequest } from '../src/lib/request-security.ts';
test('same-origin writes survive Next localhost normalisation without accepting other sites', () => {
  const request = new Request('http://localhost:3000/api/stores', {
    method: 'POST',
    headers: { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' },
    body: '{}',
  });
  assert.equal(sameOrigin(request), true);
  assert.equal(
    new URL(externalRequest(request).url).origin,
    'http://127.0.0.1:3000',
  );
  assert.equal(
    sameOrigin(
      new Request('https://shop.test/api', {
        headers: { Host: 'shop.test', Origin: 'https://evil.test' },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request('https://shop.test/api', { headers: { Host: 'shop.test' } }),
    ),
    false,
  );
});
