import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('Clerk migration preserves legacy owners, stock and access restrictions', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      'CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);',
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
    const legacy = '00000000-0000-0000-0000-000000000001';
    await pg.query('INSERT INTO auth.users VALUES ($1)', [legacy]);
    await pg.query(
      "INSERT INTO stores(id,owner_id,slug,name,settings) VALUES('legacy',$1,'legacy','Legacy','{}')",
      [legacy],
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
    assert.equal(
      (await pg.query("SELECT owner_id FROM stores WHERE id='legacy'")).rows[0]
        .owner_id,
      legacy,
    );
    await pg.exec(
      "INSERT INTO stores(id,owner_id,slug,name,settings) VALUES('new','user_clerk_test','new-store','New','{}')",
    );
    assert.equal(
      (
        await pg.query(
          "SELECT COUNT(*)::int AS n FROM stores WHERE owner_id='user_clerk_test'",
        )
      ).rows[0].n,
      1,
    );
    await pg.exec('SET ROLE authenticated');
    await assert.rejects(pg.query('SELECT * FROM stores'), /permission denied/);
  } finally {
    await pg.close();
  }
});
