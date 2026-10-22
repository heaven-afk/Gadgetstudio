import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readPreferences,
  restoreStorePreferences,
} from '../public/storefront/preferences.js';

test('broken or blocked browser storage does not prevent browsing', () => {
  for (const raw of ['null', '[]', 'true', '42', '{broken'])
    assert.deepEqual(
      readPreferences(() => raw),
      {},
    );
  assert.deepEqual(
    readPreferences(() => {
      throw new Error('blocked');
    }),
    {},
  );
});

test('stale and malformed saved selections cannot break a storefront', () => {
  const store = { id: 'one', products: [{ id: 'phone', colors: ['Black'] }] };
  const valid = { id: 'line', productId: 'phone', color: 'Black', quantity: 1 };
  const restored = restoreStorePreferences(store, {
    one: {
      cart: [
        null,
        {},
        valid,
        { ...valid, color: 'Blue' },
        { ...valid, quantity: -1 },
        { ...valid, productId: 'archived' },
      ],
      saved: [null, 'archived', 'phone'],
    },
  });
  assert.deepEqual(restored.cart, [valid]);
  assert.deepEqual(restored.saved, ['phone']);
  assert.deepEqual(
    restoreStorePreferences(
      { id: 'another', products: [] },
      { one: { cart: [valid] } },
    ).cart,
    [],
  );
});
