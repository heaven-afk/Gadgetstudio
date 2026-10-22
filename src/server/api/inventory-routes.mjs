import { fail, json, body } from './http.mjs';
import { text, integer, product, retryKey } from './validation.mjs';
import { now, uid, owned } from './repository.mjs';

export async function inventoryRoutes({ request, db, user, path, method, id }) {
  if (path[2] === 'products') {
    await owned(db, id, user);
    if (method === 'POST' && path.length === 3) {
      const v = await body(request),
        data = product(v);
      const pid = uid();
      await db
        .prepare(
          'INSERT INTO products(id,store_id,data,price,stock) VALUES(?,?,?,?,?)',
        )
        .bind(
          pid,
          id,
          JSON.stringify(data),
          integer(v.price, 1),
          integer(v.stock, 0, 100000),
        )
        .run();
      return json({ id: pid }, 201);
    }
    if (method === 'PUT' && path.length === 4) {
      const v = await body(request),
        data = product(v);
      const changed = await db
        .prepare(
          'UPDATE products SET data=?,price=?,stock=?,revision=revision+1,stock_reason=? WHERE id=? AND store_id=? AND active=1 AND revision=?',
        )
        .bind(
          JSON.stringify(data),
          integer(v.price, 1),
          integer(v.stock, 0, 100000),
          'Seller inventory adjustment',
          path[3],
          id,
          integer(v.revision, 1),
        )
        .run();
      if (!changed.meta.changes)
        fail(409, 'This product changed elsewhere. Refresh before editing.');
      return json({ saved: true });
    }
    if (method === 'DELETE' && path.length === 4) {
      const v = await body(request);
      const changed = await db
        .prepare(
          'UPDATE products SET active=0,revision=revision+1 WHERE id=? AND store_id=? AND revision=? AND active=1',
        )
        .bind(path[3], id, integer(v.revision, 1))
        .run();
      if (!changed.meta.changes)
        fail(409, 'This listing changed elsewhere. Refresh and try again.');
      return json({ removed: true });
    }
  }
  if (method === 'POST' && path[2] === 'sales' && path.length === 3) {
    await owned(db, id, user);
    const v = await body(request),
      saleId = retryKey(v.idempotencyKey);
    const previous = await db
      .prepare('SELECT * FROM sales WHERE id=?')
      .bind(saleId)
      .first();
    if (previous) {
      if (
        previous.store_id !== id ||
        previous.product_id !== v.productId ||
        previous.quantity !== v.quantity
      )
        fail(409, 'Sale reference already used.');
      return json({ recorded: true });
    }
    await db
      .prepare(
        'INSERT INTO sales(id,store_id,product_id,quantity,created) VALUES(?,?,?,?,?)',
      )
      .bind(
        saleId,
        id,
        text(v.productId, 80, true),
        integer(v.quantity, 1, 1000),
        now(),
      )
      .run();
    return json({ recorded: true });
  }
}
