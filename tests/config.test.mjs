import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, siteUrl } from '../src/lib/config.ts';
test('auth callbacks restrict redirects to internal account destinations', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/s/other',
    '/dashboard/../../evil',
    null,
  ])
    assert.equal(safeNext(value), '/dashboard');
  assert.equal(safeNext('/update-password'), '/update-password');
  assert.equal(safeNext('/dashboard#studio'), '/dashboard#studio');
});
test('production auth origin requires HTTPS and configuration', () => {
  const oldUrl = process.env.NEXT_PUBLIC_SITE_URL,
    oldMode = process.env.NODE_ENV;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.throws(siteUrl);
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    assert.throws(siteUrl);
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example/path';
    assert.equal(siteUrl(), 'https://shop.example');
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = oldUrl;
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
  }
});
