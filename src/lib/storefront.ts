import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function emptyStudio() {
  return {
    id: 'seller-studio',
    slug: null,
    name: 'Heaven Gadgets',
    displayName: 'heaven',
    phone: '',
    address: '',
    pickup: false,
    acceptsSwaps: true,
    swapPolicy:
      'All swaps are subject to device inspection and seller approval.',
    products: [],
    cart: [],
    saved: [],
    requests: [],
    events: [],
    sample: false,
    canManage: false,
  };
}

export async function storefront(initial: unknown, studio = false) {
  const template = await readFile(
    path.join(process.cwd(), 'src/features/storefront/template.html'),
    'utf8',
  );
  const safe = JSON.stringify(initial).replace(/</g, '\\u003c');
  const shell = studio
    ? template
        .replace('<body>', '<body class="studio-page">')
        .replace(
          '<dialog id="dashboard-dialog"',
          '<dialog open id="dashboard-dialog"',
        )
        .replace(
          '<div id="studio-content"></div>',
          '<div id="studio-content"><div class="empty-state"><h3>Loading your seller workspace…</h3><p>If this message remains, reload this page or check your connection.</p></div></div>',
        )
    : template;
  const html = shell.replace(
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
