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

test('production store submissions work on the current host despite a different canonical URL', () => {
  const oldMode = process.env.NODE_ENV;
  const oldSite = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3000';
    for (const host of ['gadget-studio.vercel.app', 'shop.example.com']) {
      const request = new Request('http://localhost/api/stores', {
        method: 'POST',
        headers: {
          Host: host,
          Origin: `https://${host}`,
          'Sec-Fetch-Site': 'same-origin',
        },
        body: JSON.stringify({ name: 'Mobile seller', slug: 'mobile-seller' }),
      });
      assert.equal(sameOrigin(request), true);
      assert.equal(
        new URL(externalRequest(request).url).origin,
        `https://${host}`,
      );
    }
    const blocked = [
      { Host: 'gadget-studio.vercel.app', Origin: 'https://evil.test' },
      { Host: 'gadget-studio.vercel.app', Origin: 'https://other.vercel.app' },
      { Host: 'shop.example.com', Origin: 'https://accounts.example.com' },
      { Host: 'shop.example.com', Origin: 'http://shop.example.com' },
      { Host: 'shop.example.com', Origin: 'null' },
      {
        Host: 'shop.example.com',
        Origin: 'https://shop.example.com',
        'Sec-Fetch-Site': 'cross-site',
      },
    ];
    for (const headers of blocked)
      assert.equal(
        sameOrigin(
          new Request('https://shop.example.com/api/stores', {
            method: 'POST',
            headers,
            body: '{}',
          }),
        ),
        false,
      );
  } finally {
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
    if (oldSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = oldSite;
  }
});
