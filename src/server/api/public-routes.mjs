import { fail, json } from './http.mjs';
import { storeRow, catalogue } from './repository.mjs';

export async function publicRoutes({ db, bucket, user, path, method }) {
  if (method === 'GET' && path[0] === 'me' && path.length === 1) {
    const rows = user
      ? (
          await db
            .prepare('SELECT * FROM stores WHERE owner_id=? ORDER BY created')
            .bind(user.userId)
            .all()
        ).results
      : [];
    return json({
      user: user ? { displayName: user.displayName } : null,
      stores: rows.map(storeRow),
    });
  }
  if (method === 'GET' && path[0] === 'store' && path.length === 2) {
    const s = await db
      .prepare('SELECT * FROM stores WHERE slug=?')
      .bind(path[1])
      .first();
    if (!s) fail(404, 'This store was not found.');
    return json(await catalogue(db, s, user));
  }
  if (method === 'GET' && path[0] === 'product-images' && path.length === 2) {
    if (!/^[a-zA-Z0-9-]+$/.test(path[1]) || !bucket)
      fail(404, 'Image not found.');
    const file = await bucket.get('products/' + path[1]);
    if (!file) fail(404, 'Image not found.');
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}
