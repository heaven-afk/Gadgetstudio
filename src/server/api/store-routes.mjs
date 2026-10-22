import sampleProducts from '../../features/catalog/sample-products.json' with { type: 'json' };
import { fail, json, body, form } from './http.mjs';
import { text, integer, settings } from './validation.mjs';
import {
  now,
  uid,
  requireUser,
  owned,
  catalogue,
  manage,
} from './repository.mjs';
import { imageFile } from './uploads.mjs';

export async function storeRoutes({
  request,
  db,
  bucket,
  user,
  path,
  method,
  id,
}) {
  if (method === 'POST' && path[0] === 'stores' && path.length === 1) {
    const owner = requireUser(user);
    const v = await body(request);
    const slug = text(v.slug, 50, true).toLowerCase();
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3)
      fail(
        400,
        'Use a store link of at least 3 letters, numbers and single hyphens.',
      );
    const count = await db
      .prepare('SELECT COUNT(*) AS n FROM stores WHERE owner_id=?')
      .bind(owner)
      .first();
    if (count.n >= 10) fail(400, 'This account already has 10 stores.');
    if (
      await db.prepare('SELECT id FROM stores WHERE slug=?').bind(slug).first()
    )
      fail(409, 'That store link is taken. Choose another one.');
    const id = uid(),
      name = text(v.name, 70, true);
    const config = settings({
      displayName: v.displayName || name.slice(0, 22),
      phone: '',
      address: '',
      pickup: false,
      acceptsSwaps: true,
      sampleCatalogue: v.sampleProducts === true,
    });
    const stmts = [
      db
        .prepare(
          'INSERT INTO stores(id,owner_id,slug,name,settings,created) VALUES(?,?,?,?,?,?)',
        )
        .bind(id, owner, slug, name, JSON.stringify(config), now()),
    ];
    if (v.sampleProducts === true)
      for (const p of sampleProducts) {
        const { price, stock, ...data } = p;
        delete data.id;
        stmts.push(
          db
            .prepare(
              'INSERT INTO products(id,store_id,data,price,stock) VALUES(?,?,?,?,?)',
            )
            .bind(uid(), id, JSON.stringify(data), price, stock),
        );
      }
    await db.batch(stmts);
    return json(await manage(db, id, user), 201);
  }
  if (method === 'GET' && path[2] === 'manage' && path.length === 3)
    return json(await manage(db, id, user));
  if (method === 'PATCH' && path.length === 2) {
    const s = await owned(db, id, user),
      v = await body(request),
      config = settings(v);
    const changed = await db
      .prepare(
        'UPDATE stores SET name=?,settings=?,revision=revision+1 WHERE id=? AND revision=?',
      )
      .bind(
        text(v.name, 70, true),
        JSON.stringify(config),
        id,
        integer(v.revision, 1),
      )
      .run();
    if (!changed.meta.changes)
      fail(409, 'Store settings changed elsewhere. Refresh and try again.');
    return json(
      await catalogue(
        db,
        {
          ...s,
          name: v.name.trim(),
          settings: JSON.stringify(config),
          revision: s.revision + 1,
        },
        user,
      ),
    );
  }
  if (method === 'POST' && path[2] === 'product-photo' && path.length === 3) {
    await owned(db, id, user);
    if (!bucket) fail(503, 'Image storage is unavailable.');
    const f = await form(request),
      image = await imageFile(f.get('photo')),
      key = uid();
    await bucket.put('products/' + key, image.bytes, {
      httpMetadata: { contentType: image.type },
      customMetadata: { storeId: id },
    });
    return json({ image: '/api/product-images/' + key }, 201);
  }
  if (method === 'GET' && path[2] === 'swap-images' && path.length === 4) {
    await owned(db, id, user);
    if (!bucket || !/^[a-zA-Z0-9-]+$/.test(path[3]))
      fail(404, 'Photo not found.');
    const file = await bucket.get(`swaps/${id}/${path[3]}`);
    if (!file) fail(404, 'Photo not found.');
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  }
}
