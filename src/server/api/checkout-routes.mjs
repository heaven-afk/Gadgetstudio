import { fail, json, body, form } from './http.mjs';
import { text, integer, contact, customer, retryKey } from './validation.mjs';
import {
  now,
  uid,
  productRow,
  storeRow,
  requestRow,
  prior,
} from './repository.mjs';
import { imageFile } from './uploads.mjs';
import { sha, rateLimit } from './rate-limit.mjs';
import { responseFor } from './whatsapp.mjs';

export async function checkoutRoutes({
  request,
  db,
  bucket,
  user,
  path,
  method,
  id,
}) {
  if (
    method === 'POST' &&
    ['orders', 'swaps'].includes(path[2]) &&
    path.length === 3
  ) {
    await rateLimit(db, request, user);
    const row = await db
      .prepare('SELECT * FROM stores WHERE id=?')
      .bind(id)
      .first();
    if (!row) fail(404, 'Store not found.');
    const s = storeRow(row);
    if (!s.phone)
      fail(409, 'This seller has not connected a WhatsApp number yet.');
    if (path[2] === 'orders') {
      const v = await body(request),
        details = customer(v, s),
        key = retryKey(v.idempotencyKey);
      if (!Array.isArray(v.items) || !v.items.length || v.items.length > 30)
        fail(400, 'Add between 1 and 30 items.');
      const fingerprint = await sha(
        JSON.stringify({ details, items: v.items }),
      );
      const previous = await prior(db, id, key, fingerprint);
      if (previous) return json(responseFor(s, previous));
      const items = [],
        counts = {};
      for (const i of v.items) {
        if (!i || typeof i !== 'object' || Array.isArray(i))
          fail(400, 'Each order item must include a product and quantity.');
        const p = await db
          .prepare(
            'SELECT * FROM products WHERE id=? AND store_id=? AND active=1',
          )
          .bind(text(i.productId, 80, true), id)
          .first();
        if (!p) fail(409, 'An item is no longer available.');
        const data = productRow(p),
          quantity = integer(i.quantity, 1, 100);
        if (i.price !== p.price)
          fail(
            409,
            'A product price changed. Refresh your bag before continuing.',
          );
        if (!data.colors.includes(i.color))
          fail(400, 'Select an available colour.');
        counts[p.id] = (counts[p.id] || 0) + quantity;
        if (counts[p.id] > p.stock)
          fail(409, 'There is insufficient stock for this order.');
        items.push({
          productId: p.id,
          name: data.name,
          storage: data.storage,
          condition: data.condition,
          color: i.color,
          price: p.price,
          quantity,
        });
      }
      const rid = uid(),
        total = integer(
          items.reduce((n, i) => n + i.price * i.quantity, 0),
          1,
          2147483647,
        ),
        data = { ...details, items };
      await db.batch([
        db
          .prepare(
            'INSERT INTO requests(id,store_id,kind,data,customer_id,total,created,idempotency_key,fingerprint) VALUES(?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            rid,
            id,
            'order',
            JSON.stringify(data),
            user?.userId || null,
            total,
            now(),
            key,
            fingerprint,
          ),
        ...items.map((i) =>
          db
            .prepare(
              'INSERT INTO request_items(id,request_id,product_id,quantity,price,data) VALUES(?,?,?,?,?,?)',
            )
            .bind(
              uid(),
              rid,
              i.productId,
              i.quantity,
              i.price,
              JSON.stringify(i),
            ),
        ),
      ]);
      return json(
        responseFor(
          s,
          requestRow(
            await db
              .prepare('SELECT * FROM requests WHERE id=?')
              .bind(rid)
              .first(),
          ),
        ),
        201,
      );
    }
    if (!s.acceptsSwaps)
      fail(409, 'This seller is not accepting swap requests.');
    if (!bucket) fail(503, 'Swap photo storage is unavailable.');
    const f = await form(request);
    let v;
    try {
      v = JSON.parse(String(f.get('details')));
    } catch {
      fail(400, 'Invalid swap details.');
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
      fail(400, 'Invalid swap details.');
    const key = retryKey(v.idempotencyKey);
    if (v.ownership !== true)
      fail(400, 'Confirm that you own the device and can legally trade it in.');
    const details = {
      customer: text(v.name, 100, true),
      phone: contact(v.phone),
      notes: text(v.notes ?? '', 1000),
    };
    const d = v.device || {},
      device = {
        model: text(d.model, 100, true),
        storage: text(d.storage, 80, true),
        color: text(d.color, 80, true),
        condition: text(d.condition, 100, true),
        battery: text(d.battery ?? '', 100),
        repairs: text(d.repairs, 500, true),
        faults: text(d.faults, 500, true),
        accessories: text(d.accessories, 200, true),
        lockStatus: text(d.lockStatus, 100, true),
      };
    const target = await db
      .prepare('SELECT * FROM products WHERE id=? AND store_id=? AND active=1')
      .bind(text(v.targetId, 80, true), id)
      .first();
    if (!target || target.stock < 1)
      fail(409, 'The device you want is no longer available.');
    const tp = productRow(target);
    if (!tp.colors.includes(v.color))
      fail(400, 'Choose an available target colour.');
    if (v.price !== tp.price)
      fail(
        409,
        'The target price changed. Refresh and request the swap again.',
      );
    const files = f.getAll('photos');
    if (files.length < 1 || files.length > 4)
      fail(400, 'Add 1 to 4 clear device photos.');
    const images = await Promise.all(files.map(imageFile));
    const hashes = await Promise.all(images.map((image) => sha(image.bytes)));
    const fingerprint = await sha(
      JSON.stringify({
        details,
        device,
        targetId: target.id,
        color: v.color,
        price: tp.price,
        hashes,
      }),
    );
    const previous = await prior(db, id, key, fingerprint);
    if (previous) return json(responseFor(s, previous));
    const photoKeys = [];
    try {
      for (const image of images) {
        const photoKey = uid();
        await bucket.put(`swaps/${id}/${photoKey}`, image.bytes, {
          httpMetadata: { contentType: image.type },
          customMetadata: { storeId: id },
        });
        photoKeys.push(photoKey);
      }
      const rid = uid(),
        data = {
          ...details,
          device,
          photoKeys,
          ownership: true,
          target: {
            id: tp.id,
            name: tp.name,
            storage: tp.storage,
            condition: tp.condition,
            color: v.color,
          },
        };
      await db
        .prepare(
          'INSERT INTO requests(id,store_id,kind,data,customer_id,total,target_id,created,idempotency_key,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          rid,
          id,
          'swap',
          JSON.stringify(data),
          user?.userId || null,
          tp.price,
          tp.id,
          now(),
          key,
          fingerprint,
        )
        .run();
      return json(
        responseFor(
          s,
          requestRow(
            await db
              .prepare('SELECT * FROM requests WHERE id=?')
              .bind(rid)
              .first(),
          ),
        ),
        201,
      );
    } catch (e) {
      await Promise.all(
        photoKeys.map((key) => bucket.delete(`swaps/${id}/${key}`)),
      );
      throw e;
    }
  }
}
