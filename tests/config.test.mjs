import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configured, safeNext, siteUrl } from '../src/lib/config.ts';

test('Clerk setup rejects placeholders and mismatched instance types', () => {
  const oldPublic = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const oldSecret = process.env.CLERK_SECRET_KEY;
  try {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_…';
    process.env.CLERK_SECRET_KEY = 'sk_test_…';
    assert.equal(configured(), false);
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_' + 'a'.repeat(32);
    process.env.CLERK_SECRET_KEY = 'sk_live_' + 'b'.repeat(32);
    assert.equal(configured(), false);
    process.env.CLERK_SECRET_KEY = 'sk_test_' + 'b'.repeat(32);
    assert.equal(configured(), true);
  } finally {
    if (oldPublic === undefined)
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = oldPublic;
    if (oldSecret === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = oldSecret;
  }
});
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
