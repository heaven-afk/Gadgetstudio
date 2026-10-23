import { PGlite } from '@electric-sql/pglite';
import { createDatabase } from '../src/lib/database.mjs';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { handleApi } from '../src/server/api/index.mjs';

const pg = new PGlite();
await pg.exec(
  `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
);
await pg.exec(
  await readFile(
    new URL(
      '../supabase/migrations/202610220001_platform.sql',
      import.meta.url,
    ),
    'utf8',
  ),
);
await pg.exec(
  `INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`,
);
await pg.exec(
  await readFile(
    new URL(
      '../supabase/migrations/202610230001_clerk_owners.sql',
      import.meta.url,
    ),
    'utf8',
  ),
);
function connection(tx = pg) {
  return {
    async unsafe(sql, args) {
      const result = await tx.query(sql, args);
      const rows = result.rows;
      rows.count = result.affectedRows || 0;
      return rows;
    },
    begin(fn) {
      return pg.transaction((tx) => fn(connection(tx)));
    },
  };
}
const db = createDatabase(connection());
const objects = new Map(),
  bucket = {
    async put(key, bytes, meta) {
      objects.set(key, { bytes: new Uint8Array(bytes), ...meta });
    },
    async get(key) {
      const f = objects.get(key);
      return f ? { body: f.bytes, httpMetadata: f.httpMetadata } : null;
    },
    async delete(key) {
      objects.delete(key);
    },
  };
const alice = {
    userId: 'user_alice_clerk',
    displayName: 'Alice',
  },
  bob = { userId: 'user_bob_clerk', displayName: 'Bob' };
async function call(
  path,
  { method = 'GET', data, user = alice, origin = 'https://test.local' } = {},
) {
  const headers = {};
  if (method !== 'GET') headers.origin = origin;
  if (data && !(data instanceof FormData))
    headers['content-type'] = 'application/json';
  const response = await handleApi(
    new Request('https://test.local/api/' + path, {
      method,
      headers,
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    }),
    db,
    bucket,
    user,
  );
  let value;
  try {
    value = await response.json();
  } catch {
    value = null;
  }
  return { status: response.status, value };
}
const check = (r, status) => {
  assert.equal(r.status, status, JSON.stringify(r.value));
  return r.value;
};
check(
  await call('stores', {
    method: 'POST',
    data: { name: 'Forbidden', slug: 'forbidden' },
    user: null,
  }),
  401,
);
const a = check(
  await call('stores', {
    method: 'POST',
    data: {
      name: 'Alice Gadgets',
      slug: 'alice-gadgets',
      sampleProducts: true,
    },
  }),
  201,
);
const b = check(
  await call('stores', {
    method: 'POST',
    data: { name: 'Bob Gadgets', slug: 'bob-gadgets' },
    user: bob,
  }),
  201,
);
check(await call(`stores/${a.id}/manage`, { user: bob }), 403);
check(await call(`stores/${a.id}/manage`, { user: null }), 401);
assert.equal(check(await call('me', { user: bob }), 200).stores[0].id, b.id);
const settings = {
  name: a.name,
  displayName: 'alice',
  phone: '2340000000000',
  address: 'Sample pickup',
  pickup: true,
  acceptsSwaps: true,
  swapPolicy: 'Inspection required',
  revision: a.revision,
};
check(await call(`stores/${a.id}`, { method: 'PATCH', data: settings }), 200);
check(await call(`stores/${a.id}`, { method: 'PATCH', data: settings }), 409);
check(
  await call(`stores/${a.id}`, {
    method: 'PATCH',
    data: settings,
    origin: 'https://evil.test',
  }),
  403,
);
const publicStore = check(
  await call('store/alice-gadgets', { user: null }),
  200,
);
assert.equal(publicStore.canManage, false);
assert.equal(publicStore.ownerId, undefined);
assert.equal(publicStore.requests, undefined);
const phone = publicStore.products.find((p) => p.name === 'iPhone 13');
const laptop = publicStore.products.find((p) => p.category === 'Laptops');
const order = {
  name: 'Test buyer',
  phone: '0000000000',
  fulfillment: 'delivery',
  address: 'Test address',
  notes: 'Confirm warranty',
  items: [
    {
      productId: phone.id,
      color: phone.colors[0],
      quantity: 1,
      price: phone.price,
    },
  ],
  idempotencyKey: crypto.randomUUID(),
};
check(
  await call(`stores/${a.id}/orders`, {
    method: 'POST',
    data: { ...order, items: [{ ...order.items[0], price: 1 }] },
    user: null,
  }),
  409,
);
const first = check(
  await call(`stores/${a.id}/orders`, {
    method: 'POST',
    data: order,
    user: null,
  }),
  201,
);
assert.equal(first.request.status, 'submitted');
assert.equal(first.request.total, phone.price);
assert.equal(new URL(first.whatsappUrl).hostname, 'wa.me');
const retry = check(
  await call(`stores/${a.id}/orders`, {
    method: 'POST',
    data: order,
    user: null,
  }),
  200,
);
assert.equal(retry.request.id, first.request.id);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === phone.id,
  ).stock,
  1,
);
check(
  await call(`stores/${a.id}/requests/${first.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: first.request.revision },
    user: bob,
  }),
  403,
);
check(
  await call(`stores/${a.id}/requests/${first.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: first.request.revision },
  }),
  200,
);
check(
  await call(`stores/${a.id}/requests/${first.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: first.request.revision },
  }),
  200,
);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === phone.id,
  ).stock,
  0,
  'Repeated completion must deduct stock only once',
);
const physical = {
  productId: laptop.id,
  quantity: 1,
  idempotencyKey: crypto.randomUUID(),
};
check(
  await call(`stores/${a.id}/sales`, { method: 'POST', data: physical }),
  200,
);
check(
  await call(`stores/${a.id}/sales`, { method: 'POST', data: physical }),
  200,
);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === laptop.id,
  ).stock,
  laptop.stock - 1,
);
const other = publicStore.products.find((p) => p.name === 'AirPods Pro');
const atomicOrder = {
  ...order,
  idempotencyKey: crypto.randomUUID(),
  items: [
    {
      productId: laptop.id,
      color: laptop.colors[0],
      quantity: 1,
      price: laptop.price,
    },
    {
      productId: other.id,
      color: other.colors[0],
      quantity: 1,
      price: other.price,
    },
  ],
};
const atomic = check(
  await call(`stores/${a.id}/orders`, { method: 'POST', data: atomicOrder }),
  201,
);
let current = check(await call('store/alice-gadgets'), 200).products.find(
  (p) => p.id === other.id,
);
check(
  await call(`stores/${a.id}/products/${other.id}`, {
    method: 'PUT',
    data: { ...current, stock: 0 },
  }),
  200,
);
check(
  await call(`stores/${a.id}/requests/${atomic.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: atomic.request.revision },
  }),
  409,
);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === laptop.id,
  ).stock,
  laptop.stock - 1,
  'A failed multi-item confirmation must not partially deduct stock',
);
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const swapData = {
  name: 'Swap buyer',
  phone: '0000000000',
  notes: 'Inspection please',
  targetId: laptop.id,
  color: laptop.colors[0],
  price: laptop.price,
  ownership: true,
  idempotencyKey: crypto.randomUUID(),
  device: {
    model: 'Old laptop',
    storage: '256GB',
    color: 'Silver',
    condition: 'Good',
    battery: 'Unknown',
    repairs: 'None known',
    faults: 'Small scratch',
    accessories: 'Charger',
    lockStatus: 'Unlocked',
  },
};
function swapForm() {
  const f = new FormData();
  f.set('details', JSON.stringify(swapData));
  f.append('photos', new File([png], 'device.png', { type: 'image/png' }));
  return f;
}
const swap = check(
  await call(`stores/${a.id}/swaps`, {
    method: 'POST',
    data: swapForm(),
    user: null,
  }),
  201,
);
assert.equal(swap.request.credit, null);
assert.equal(swap.request.topUp, null);
assert.equal(
  check(
    await call(`stores/${a.id}/swaps`, {
      method: 'POST',
      data: swapForm(),
      user: null,
    }),
    200,
  ).request.id,
  swap.request.id,
);
assert.equal(objects.size, 1, 'Swap retries must not leave duplicate uploads');
check(
  await call(`stores/${a.id}/swap-images/${swap.request.photoKeys[0]}`, {
    user: bob,
  }),
  403,
);
check(
  await call(`stores/${a.id}/swap-images/${swap.request.photoKeys[0]}`, {
    user: null,
  }),
  401,
);
check(
  await call(`stores/${a.id}/swap-images/${swap.request.photoKeys[0]}`),
  200,
);
check(
  await call(`stores/${a.id}/requests/${swap.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: 1 },
  }),
  409,
);
const quoted = check(
  await call(`stores/${a.id}/requests/${swap.request.id}`, {
    method: 'PATCH',
    data: {
      status: 'quoted',
      credit: 100000,
      sellerNote: 'Inspected; agreed with customer',
      revision: 1,
    },
  }),
  200,
).request;
assert.equal(quoted.topUp, laptop.price - 100000);
check(
  await call(`stores/${a.id}/requests/${swap.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: quoted.revision },
  }),
  200,
);
check(
  await call(`stores/${a.id}/requests/${swap.request.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: quoted.revision },
  }),
  200,
);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === laptop.id,
  ).stock,
  laptop.stock - 2,
);
// Quotes must be refreshed if the target price changes before completion.
swapData.idempotencyKey = crypto.randomUUID();
const repriced = check(
  await call(`stores/${a.id}/swaps`, {
    method: 'POST',
    data: swapForm(),
    user: null,
  }),
  201,
).request;
const oldQuote = check(
  await call(`stores/${a.id}/requests/${repriced.id}`, {
    method: 'PATCH',
    data: { status: 'quoted', credit: 100000, revision: 1 },
  }),
  200,
).request;
current = check(await call('store/alice-gadgets'), 200).products.find(
  (p) => p.id === laptop.id,
);
check(
  await call(`stores/${a.id}/products/${laptop.id}`, {
    method: 'PUT',
    data: { ...current, price: current.price + 1000 },
  }),
  200,
);
check(
  await call(`stores/${a.id}/requests/${repriced.id}`, {
    method: 'PATCH',
    data: { status: 'completed', revision: oldQuote.revision },
  }),
  409,
);
assert.equal(
  check(await call('store/alice-gadgets'), 200).products.find(
    (p) => p.id === laptop.id,
  ).stock,
  laptop.stock - 2,
);
const history = check(await call(`stores/${a.id}/manage`), 200).events;
check(await call('me/extra'), 404);
check(await call(`other/${a.id}/manage`), 404);
check(
  await call(`stores/${a.id}/sales/extra`, { method: 'POST', data: physical }),
  404,
);
check(
  await call(`stores/${a.id}/product-photo/extra`, {
    method: 'POST',
    data: {},
  }),
  404,
);
check(
  await call(`stores/${a.id}/orders`, {
    method: 'POST',
    data: { ...order, idempotencyKey: crypto.randomUUID(), items: [null] },
    user: null,
  }),
  400,
);
const invalidSwap = new FormData();
invalidSwap.set('details', 'null');
check(
  await call(`stores/${a.id}/swaps`, {
    method: 'POST',
    data: invalidSwap,
    user: null,
  }),
  400,
);
const expensive = check(
  await call(`stores/${a.id}/products`, {
    method: 'POST',
    data: { ...current, price: 1000000000, stock: 3 },
  }),
  201,
);
check(
  await call(`stores/${a.id}/orders`, {
    method: 'POST',
    data: {
      ...order,
      idempotencyKey: crypto.randomUUID(),
      items: [
        {
          productId: expensive.id,
          color: current.colors[0],
          quantity: 3,
          price: 1000000000,
        },
      ],
    },
    user: null,
  }),
  400,
);
assert(history.some((e) => e.reason.includes('Completed swap')));
assert(history.every((e) => e.balance >= 0));
assert.equal(
  check(await call(`stores/${b.id}/manage`, { user: bob }), 200).events.length,
  0,
);
console.log(
  'PASS: seller authorization, tenant isolation, CSRF, optimistic edits, authoritative prices, order/swap idempotency, atomic stock deductions, private photos, inspected swap quotes and stock history.',
);
await pg.exec('SET ROLE anon');
await assert.rejects(
  pg.query('SELECT * FROM public.stores'),
  /permission denied/,
);
await pg.exec('RESET ROLE; SET ROLE authenticated');
await assert.rejects(
  pg.query('SELECT * FROM public.requests'),
  /permission denied/,
);
await pg.exec('RESET ROLE');
const archiveCandidate = check(await call(`stores/${a.id}/manage`), 200)
  .products[0];
check(
  await call(`stores/${a.id}/products/${archiveCandidate.id}`, {
    method: 'DELETE',
    data: { revision: archiveCandidate.revision },
  }),
  200,
);
const archived = check(
  await call(`stores/${a.id}/manage`),
  200,
).archivedProducts.find((p) => p.id === archiveCandidate.id);
assert(archived);
const restorePath = `stores/${a.id}/products/${archived.id}/restore`;
check(
  await call(restorePath, {
    method: 'POST',
    data: { revision: archived.revision },
    user: null,
  }),
  401,
);
check(
  await call(restorePath, {
    method: 'POST',
    data: { revision: archived.revision },
    user: bob,
  }),
  403,
);
check(
  await call(restorePath, {
    method: 'POST',
    data: { revision: archiveCandidate.revision },
  }),
  409,
);
const beforeRestore = check(await call(`stores/${a.id}/manage`), 200).events;
check(
  await call(restorePath, {
    method: 'POST',
    data: { revision: archived.revision },
  }),
  200,
);
check(
  await call(restorePath, {
    method: 'POST',
    data: { revision: archived.revision },
  }),
  409,
);
const restoredStore = check(await call(`stores/${a.id}/manage`), 200);
const restored = restoredStore.products.find((p) => p.id === archived.id);
assert.equal(restored.stock, archived.stock);
assert.equal(restored.price, archived.price);
assert.equal(restored.revision, archived.revision + 1);
assert.deepEqual(restoredStore.events, beforeRestore);
assert(!restoredStore.archivedProducts.some((p) => p.id === archived.id));
console.log(
  'PASS: archived listing restoration, ownership, stale revisions and preserved stock history.',
);
await pg.close();
