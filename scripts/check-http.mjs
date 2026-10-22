// Check the built app with missing credentials. No emails, production records or
// external requests are made. The child server and test port are owned here.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_SECRET_KEY: '',
  DATABASE_URL: '',
  NEXT_TELEMETRY_DISABLED: '1',
};
const server = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
  ],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
let log = '';
server.stdout.on('data', (c) => {
  log = (log + c).slice(-4000);
});
server.stderr.on('data', (c) => {
  log = (log + c).slice(-4000);
});
const base = 'http://127.0.0.1:3100';
try {
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('Built server did not start: ' + log);
  let r = await fetch(base);
  assert.equal(r.status, 200);
  const home = await r.text();
  assert(home.includes('Your store.'));
  assert(home.includes('/sign-up'));
  assert(!home.includes('ChatGPT'));
  r = await fetch(base + '/demo');
  assert.equal(r.status, 200);
  const demo = await r.text();
  assert(demo.includes('swap-dialog'));
  const initial = demo.match(/window\.__INITIAL_STORE__=(.*?);<\/script>/)?.[1];
  assert(
    initial,
    'The demo must receive catalogue data, never the route Request object',
  );
  const catalogue = JSON.parse(initial);
  assert.equal(catalogue.id, 'demo');
  assert.equal(catalogue.sample, true);
  assert(catalogue.products.length > 0);
  for (const asset of [
    'index.js',
    'api.js',
    'dom.js',
    'icons.js',
    'preferences.js',
    'studio.js',
    'styles.css',
  ]) {
    const assetResponse = await fetch(base + '/storefront/' + asset);
    assert.equal(assetResponse.status, 200, asset);
  }
  for (const path of [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/update-password',
  ]) {
    r = await fetch(base + path);
    assert.equal(r.status, 200);
    assert((await r.text()).includes('Seller accounts are not connected yet'));
  }
  r = await fetch(base + '/dashboard', { redirect: 'manual' });
  assert.equal(r.status, 307);
  assert(r.headers.get('location').startsWith('/sign-in'));
  r = await fetch(base + '/s/unconfigured-store');
  assert.equal(r.status, 503);
  assert(!(await r.text()).includes('iPhone'));
  r = await fetch(base + '/api/me');
  assert.deepEqual(await r.json(), { user: null, stores: [] });
  r = await fetch(base + '/api/auth/sign-in', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.test',
      password: 'not-a-real-password',
    }),
  });
  assert.equal(r.status, 503);
  r = await fetch(base + '/api/auth/sign-in', {
    method: 'POST',
    headers: {
      Origin: 'https://evil.test',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(r.status, 403);
  r = await fetch(base + '/api/auth/signout');
  assert.equal(r.status, 405);
  r = await fetch(base + '/storefront/index.js');
  assert.equal(r.status, 200);
  const client = await r.text();
  assert(!client.includes('signin-with-chatgpt'));
  assert(!client.includes('SUPABASE_SECRET_KEY'));
  console.log(
    'PASS: built homepage/demo, account setup states, protected dashboard, no false storefronts, CSRF and POST-only sign-out.',
  );
} finally {
  server.kill('SIGTERM');
}
