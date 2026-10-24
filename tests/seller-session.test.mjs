import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase } from '../src/lib/database.mjs';
import {
  checkSellerSession,
  IDLE_TIMEOUT_MS,
} from '../src/server/seller-session.mjs';

test('seller idle expiry survives refresh, background polling, replay and concurrent activity', async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    await pg.exec(
      await readFile(
        new URL(
          '../supabase/migrations/202610240001_seller_sessions.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const db = createDatabase({
      async unsafe(sql, args) {
        return (await pg.query(sql, args)).rows;
      },
    });
    const read = (
      now,
      touch = false,
      sessionId = 'session_one',
      userId = 'seller_one',
    ) => checkSellerSession(db, { now, touch, sessionId, userId });
    const first = await read(1000);
    assert.equal(first.active, true);
    assert.equal(first.expiresAt, 1000 + IDLE_TIMEOUT_MS);
    assert.equal(
      (await read(700000)).expiresAt,
      first.expiresAt,
      'polling cannot extend the deadline',
    );
    const active = await read(800000, true);
    assert.equal(active.expiresAt, 800000 + IDLE_TIMEOUT_MS);
    assert.equal(
      (await read(900000)).expiresAt,
      active.expiresAt,
      'a second tab sees the same deadline',
    );
    assert.equal((await read(active.expiresAt - 1)).active, true);
    assert.equal(
      (await read(active.expiresAt, true)).active,
      false,
      'late activity at the exact boundary must fail',
    );
    assert.equal(
      (await read(active.expiresAt + 1)).active,
      false,
      'refresh cannot reinitialize an expired session',
    );
    const replay = await Promise.all([
      read(active.expiresAt + 2, true),
      read(active.expiresAt + 2, true),
    ]);
    assert(
      replay.every((item) => !item.active),
      'concurrent activity cannot revive expiry',
    );
    assert.equal(
      (await read(active.expiresAt + 3, true, 'session_new_login')).active,
      true,
      'a fresh Clerk sign-in gets a new session',
    );
    assert.equal(
      (await read(1100, true, 'session_new_login', 'another_seller')).active,
      false,
      'session IDs are bound to the verified owner',
    );
    await pg.exec('SET ROLE anon;');
    await assert.rejects(
      pg.query('SELECT * FROM seller_sessions'),
      /permission denied/i,
    );
    await pg.exec('RESET ROLE; SET ROLE authenticated;');
    await assert.rejects(
      pg.query('SELECT * FROM seller_sessions'),
      /permission denied/i,
    );
  } finally {
    await pg.close();
  }
});
