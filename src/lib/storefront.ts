import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sampleProducts from '@/features/catalog/sample-products.json';

export function demoStore() {
  return {
    id: 'demo',
    slug: null,
    name: 'Heaven Gadgets',
    displayName: 'heaven',
    phone: '',
    address: '',
    pickup: false,
    acceptsSwaps: true,
    swapPolicy:
      'All swaps are subject to device inspection and seller approval.',
    products: sampleProducts,
    cart: [],
    saved: [],
    requests: [],
    events: [],
    sample: true,
    canManage: false,
  };
}

export async function storefront(initial: unknown = demoStore()) {
  const template = await readFile(
    path.join(process.cwd(), 'src/features/storefront/template.html'),
    'utf8',
  );
  const safe = JSON.stringify(initial).replace(/</g, '\\u003c');
  const html = template.replace(
    '<script src="/storefront/index.js"',
    `<script>window.__INITIAL_STORE__=${safe};</script><script src="/storefront/index.js"`,
  );
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
