import { fail, json, body } from './http.mjs';
import { text, integer } from './validation.mjs';
import { owned, requestRow } from './repository.mjs';

export async function requestRoutes({ request, db, user, path, method, id }) {
  if (method === 'PATCH' && path[2] === 'requests' && path.length === 4) {
    await owned(db, id, user);
    const v = await body(request);
    const r = await db
      .prepare('SELECT * FROM requests WHERE id=? AND store_id=?')
      .bind(path[3], id)
      .first();
    if (!r) fail(404, 'Request not found.');
    if (r.status === 'completed' && v.status === 'completed')
      return json({ request: requestRow(r) });
    const allowed =
      r.kind === 'swap'
        ? {
            submitted: ['reviewing', 'quoted', 'declined'],
            reviewing: ['quoted', 'declined'],
            quoted: ['reviewing', 'quoted', 'declined', 'completed'],
          }
        : {
            submitted: ['reviewing', 'declined', 'completed'],
            reviewing: ['declined', 'completed'],
          };
    if (!allowed[r.status]?.includes(v.status))
      fail(409, 'This request cannot move to that status.');
    let credit = r.credit,
      quote = r.quote_price;
    if (v.status === 'quoted') {
      const p = await db
        .prepare(
          'SELECT * FROM products WHERE id=? AND store_id=? AND active=1',
        )
        .bind(r.target_id, id)
        .first();
      if (!p || p.stock < 1) fail(409, 'The requested device is unavailable.');
      credit = integer(v.credit, 0, p.price);
      quote = p.price;
    }
    const result = await db
      .prepare(
        'UPDATE requests SET status=?,credit=?,quote_price=?,seller_note=?,revision=revision+1 WHERE id=? AND store_id=? AND revision=?',
      )
      .bind(
        v.status,
        credit,
        quote,
        text(v.sellerNote ?? r.seller_note, 1000),
        r.id,
        id,
        integer(v.revision, 1),
      )
      .run();
    if (!result.meta.changes)
      fail(409, 'This request changed elsewhere. Refresh and try again.');
    return json({
      request: requestRow(
        await db
          .prepare('SELECT * FROM requests WHERE id=?')
          .bind(r.id)
          .first(),
      ),
    });
  }
}
