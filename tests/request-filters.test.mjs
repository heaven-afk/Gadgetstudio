import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRequests } from '../public/storefront/request-filters.js';

const requests = [
  {
    id: 'abcd1234-001',
    kind: 'order',
    status: 'submitted',
    customer: 'Ada',
    phone: '+2348031234567',
    items: [{ name: 'iPhone 15' }],
  },
  {
    id: 'swap-002',
    kind: 'swap',
    status: 'quoted',
    customer: 'Bola',
    device: { model: 'Galaxy S22' },
    target: { name: 'iPhone 16' },
  },
  { id: 'order-003', kind: 'order', status: 'completed', customer: 'Ada' },
  { id: 'swap-004', kind: 'swap', status: 'declined' },
];
test('request filters combine kind, status and customer search without changing source order', () => {
  assert.deepEqual(
    filterRequests(requests, { status: 'open' }),
    requests.slice(0, 2),
  );
  assert.deepEqual(
    filterRequests(requests, {
      kind: 'order',
      status: 'open',
      search: ' ADA ',
    }),
    [requests[0]],
  );
  assert.deepEqual(filterRequests(requests, { status: 'completed' }), [
    requests[2],
  ]);
  assert.deepEqual(
    filterRequests(requests, { kind: 'swap', status: 'completed' }),
    [],
  );
  assert.deepEqual(filterRequests(requests), requests);
});
test('search finds displayed references, phone numbers and both sides of a device swap', () => {
  for (const search of ['#ABCD1234', '803123', 'iphone 15'])
    assert.deepEqual(filterRequests(requests, { search }), [requests[0]]);
  for (const search of ['galaxy', 'IPHONE 16'])
    assert.deepEqual(filterRequests(requests, { search }), [requests[1]]);
  assert.deepEqual(filterRequests(requests, { search: '<script>' }), []);
});
