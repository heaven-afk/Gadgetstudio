import { fail } from './http.mjs';
const now = () => new Date().toISOString();

const uid = () => crypto.randomUUID();

const parse = (raw) => JSON.parse(raw);

function requireUser(user) {
  if (!user?.userId) fail(401, 'Sign in to manage a store.');
  return user.userId;
}

async function owned(db, id, user) {
  const userId = requireUser(user);
  const s = await db
    .prepare('SELECT * FROM stores WHERE id=? AND owner_id=?')
    .bind(id, userId)
    .first();
  if (!s) fail(403, 'You do not have access to this store.');
  return s;
}

const productRow = (row) => ({
  ...parse(row.data),
  id: row.id,
  price: row.price,
  stock: row.stock,
  revision: row.revision,
});

const storeRow = (row) => ({
  ...parse(row.settings),
  id: row.id,
  slug: row.slug,
  name: row.name,
  revision: row.revision,
});

const requestRow = (row) => ({
  ...parse(row.data),
  id: row.id,
  kind: row.kind,
  status: row.status,
  total: row.total,
  credit: row.credit,
  quotePrice: row.quote_price,
  topUp: row.credit === null ? null : row.quote_price - row.credit,
  sellerNote: row.seller_note,
  revision: row.revision,
  created: row.created,
});

async function productsFor(db, id) {
  return (
    await db
      .prepare(
        'SELECT * FROM products WHERE store_id=? AND active=1 ORDER BY created,id',
      )
      .bind(id)
      .all()
  ).results.map(productRow);
}

async function catalogue(db, s, user) {
  return {
    ...storeRow(s),
    canManage: !!user && s.owner_id === user.userId,
    products: await productsFor(db, s.id),
  };
}

async function manage(db, id, user) {
  const s = await owned(db, id, user);
  return {
    ...(await catalogue(db, s, user)),
    requests: (
      await db
        .prepare(
          'SELECT * FROM requests WHERE store_id=? ORDER BY created DESC LIMIT 200',
        )
        .bind(id)
        .all()
    ).results.map(requestRow),
    events: (
      await db
        .prepare(
          'SELECT e.*,p.data FROM inventory_events e JOIN products p ON p.id=e.product_id WHERE e.store_id=? ORDER BY e.created DESC,e.id DESC LIMIT 100',
        )
        .bind(id)
        .all()
    ).results.map((e) => ({ ...e, name: parse(e.data).name, data: undefined })),
  };
}

async function prior(db, storeId, key, fingerprint) {
  const row = await db
    .prepare('SELECT * FROM requests WHERE store_id=? AND idempotency_key=?')
    .bind(storeId, key)
    .first();
  if (row) {
    if (row.fingerprint !== fingerprint)
      fail(
        409,
        'This reference was used for different details. Start a new request.',
      );
    return requestRow(row);
  }
  return null;
}

export {
  now,
  uid,
  parse,
  requireUser,
  owned,
  productRow,
  storeRow,
  requestRow,
  productsFor,
  catalogue,
  manage,
  prior,
};
