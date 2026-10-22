import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileSql} from '../lib/database.mjs';
test('parameter numbering ignores quoted question marks and escaped SQL quotes',()=>{assert.deepEqual(compileSql("SELECT '?' AS note, ? AS input, 'it''s ?' AS literal, ? AS final"),{sql:"SELECT '?' AS note, $1 AS input, 'it''s ?' AS literal, $2 AS final",count:2});});
test('query values never enter SQL text',()=>{assert.equal(compileSql('SELECT * FROM stores WHERE id=? AND owner_id=?').sql,'SELECT * FROM stores WHERE id=$1 AND owner_id=$2');});
