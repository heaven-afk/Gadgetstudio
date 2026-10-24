# Source map

The repository root is the Vercel project root. Application source lives in `src/`; database migrations, tests and browser-served assets have their own directories.

```text
src/
  app/                     Next.js pages and HTTP route adapters
    api/                   Auth and business API entry points
    auth/                  Email confirmation and callback routes
    dashboard/             Protected seller interface
    s/[slug]/              One seller's public store
  components/              Shared account UI
  features/
    catalog/               Single source for sample products
    marketing/             Homepage sections
    storefront/            HTML storefront shell
  lib/                     Configuration, session, DB and rendering adapters
  server/api/
    index.mjs              Dispatch, origin checks and error translation
    public-routes.mjs      Public catalogues, account summary and product images
    store-routes.mjs       Store creation, settings, management and photo access
    inventory-routes.mjs   Product editing, archiving and physical sales
    request-routes.mjs     Seller review, quotes and completion
    checkout-routes.mjs    Customer order and device swap submissions
    http.mjs               Bounded request parsing and HTTP errors
    validation.mjs         Field and business input rules
    repository.mjs         Ownership checks and record mapping
    rate-limit.mjs         Submission limits and fingerprints
    uploads.mjs            Photo validation
    whatsapp.mjs           Prepared customer messages
  proxy.ts                 Clerk session verification
public/
  assets/                  Gadget illustrations and sample photos
  storefront/              Native browser modules and storefront styles
supabase/migrations/        PostgreSQL schema, access rules and stock triggers
tests/                     Business, security and browser preference regressions
scripts/check-http.mjs      Production server smoke check
docs/                      Architecture and deployment instructions
```

## Request boundaries

Next route adapters verify the Clerk session and request origin, then supply a database connection and object storage to the business API. The business layer accepts these dependencies explicitly, so tests exercise the same code against PostgreSQL without contacting a live seller database. Each store operation checks ownership; customers can submit requests without signing in.

The business modules are JavaScript ES modules. The route adapters and React pages use TypeScript. The storefront still uses a standalone HTML shell and browser modules; this is intentional to preserve its current interactions during the migration. It is not a fully React-based storefront.

Browser modules share utilities through explicit imports. `studio.js` receives accessors for the current account, store and selected tab, rather than importing mutable globals. `preferences.js` validates optional browser data; saved baskets never determine server prices or stock.

## Rendering and sample data

The renderer reads `src/features/storefront/template.html`, injects escaped initial store JSON, and returns HTML. Next's file tracing configuration includes that template in server deployments. The public demo route has been removed; the renderer requires explicit initial data.

The optional seller sample catalogue uses `src/features/catalog/sample-products.json`. Real `/s/[slug]` routes fetch that seller's catalogue and fail with an error when unavailable. They do not substitute sample listings. The dashboard is a React page that embeds the protected /dashboard/workspace document. That document starts with an empty catalogue and opens the seller workspace inline.

The marketing homepage is composed from independent section components. Its global stylesheet is separate from the storefront stylesheet because the raw HTML storefront does not use the Next React layout.

## Data and inventory

Business tables and private image buckets are created by the committed migration. Database and Storage credentials stay server-side. Direct business-table access is revoked from anonymous and authenticated Supabase Data API roles; server APIs enforce seller ownership.

Order and swap requests do not reserve inventory. Confirming a physical sale or completing a request changes stock through database triggers and records history atomically. Optimistic revisions protect seller edits. Idempotency keys protect retries. A swap needs a seller quote based on current stock and price before completion.

Amounts are whole naira. Product prices and request totals must fit their database integer bounds; totals above 2,147,483,647 are rejected before insertion. Colours share the quantity of their product listing. A separately tracked used device or colour configuration needs its own listing.

## Working on changes

The homepage unboxing film uses a self-hosted, silent H.264 video of a real smartphone unboxing. Four text chapters follow the video's own playback time; chapter selection seeks and pauses the film. The final chapter shows live CET (UTC+1). Playback pauses offscreen and in hidden tabs, respects reduced motion, and offers manual playback when autoplay is blocked. A poster extracted from the footage remains available before playback or if loading fails. See `media-credits.md` for source and license details. `device-visuals.css` separately preserves the hero indicator lights and swap illustrations.

1. Use Node.js 24 and install with `npm ci`.
2. Format with `npm run format`; CI checks `npm run format:check`.
3. Run `npm test` for business and security checks.
4. Run `npm run build`, `npm run typecheck` and `npm run test:http`.
5. For visual or interaction changes, open the local app and check desktop and mobile browsing, filtering, bag and swap flows.

Type checking regenerates Next route types, including on a fresh checkout. The HTTP check runs an isolated built server with service credentials disabled and checks setup states and protected workspace access. Hosted email, pooler and actual Storage behavior still need the deployment acceptance checks.

The old Sites prototype is a separate sibling project. Its SQLite migrations, Cloudflare bindings and identity provider are not dependencies of this app.

## Clerk ownership migration

Clerk account components are only mounted while signed out. Completing a login passes through `/auth/complete` and performs a full document navigation so the dashboard reads the new session rather than a prefetched signed-out response. If a configured dashboard cannot verify a session, it renders recovery controls without redirecting back into Clerk's signed-in account redirect. The workspace returns an explicit 401 instead of loading the sign-in widget inside its frame. Legacy account form CSS excludes `.clerk-account` to preserve Clerk's layout.

The Next.js config preserves original Proxy URLs with `skipProxyUrlNormalize`. Clerk attaches session metadata through a same-origin rewrite; normalizing that URL to localhost on this Next.js runtime can stall local account requests. Development server logs belong outside `.next/` (use ignored `.local-runtime/`) to avoid Windows file locks during builds.

202610230001_clerk_owners.sql converts stores.owner_id to text while preserving legacy IDs. Clerk user IDs are used directly for new stores. No email-based ownership reassignment or browser-provided identity is accepted. Supabase Auth is not used by the application; Supabase remains the PostgreSQL and private Storage provider.
