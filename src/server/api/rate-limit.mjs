import { fail } from './http.mjs';
async function sha(value) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        value instanceof Uint8Array ? value : new TextEncoder().encode(value),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}

async function rateLimit(db, request, user) {
  const epoch = Math.floor(Date.now() / 3600000);
  const identity =
    user?.userId ||
    request.headers.get('x-heaven-client-ip') ||
    'unknown-client';
  const key = await sha(epoch + ':' + identity);
  const row = await db
    .prepare(
      'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count',
    )
    .bind(key, Date.now() + 7200000)
    .first();
  if (row.count > 40) fail(429, 'Too many requests. Please try again later.');
  await db
    .prepare('DELETE FROM rate_limits WHERE expires<?')
    .bind(Date.now())
    .run();
}

export { sha, rateLimit };
