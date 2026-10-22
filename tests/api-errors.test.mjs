import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/server/api/index.mjs';
import { body } from '../src/server/api/http.mjs';

test('JSON submissions must contain an object', async () => {
  for (const raw of ['null', '[]', 'true', '"hello"', '{broken']) {
    await assert.rejects(
      body(
        new Request('https://shop.test/api/stores', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: raw,
        }),
      ),
      (error) => error.status === 400,
    );
  }
});

test('PostgreSQL unique conflicts have a useful retry response', async () => {
  const db = {
    prepare() {
      throw Object.assign(
        new Error('duplicate key value violates unique constraint'),
        { code: '23505' },
      );
    },
  };
  const response = await handleApi(
    new Request('https://shop.test/api/me'),
    db,
    null,
    { userId: 'seller' },
  );
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /already in use/);
});
