# Heaven Gadget Studio

Standalone Next.js app prepared for Vercel, with Clerk email/password and Google authentication, PostgreSQL inventory and Supabase Storage. This is the active application; the older Sites preview is retained separately in `../archive/heaven-gadgets` and is not a deployment dependency.

**Connecting your services? Start with [SETUP.md](SETUP.md).** The Supabase migration is in `supabase/migrations/`, and local credentials belong in `.env.local`. Copy `.env.example` if that local file does not exist.

## Interfaces

- `/`: the platform homepage for gadget business owners.
- `/s/[slug]`: one seller's public storefront, showing only their products and WhatsApp number.
- `/dashboard`: seller management, protected by a verified Clerk identity.
- `/sign-up`, `/sign-in`, `/forgot-password`, `/update-password`: seller account flows.
- Customers do not need accounts to browse or request an order/swap.
- Sellers can review archived listings in the dashboard and restore them with their existing price and stock. Archived listings remain hidden from the public catalogue until restored.
- The seller request inbox opens on active requests, with combined order/swap, status and customer/device search filters. Filters stay selected while updating requests. The inbox covers the latest 200 requests loaded for that store.

## Run

Use Node.js 24 and npm. Run `npm ci`, copy `.env.example` to `.env.local`, supply the project configuration, then `npm run dev`. Without Clerk configuration, the homepage works, while account forms show a setup message and protected functionality fails closed. There is no fake sign-in or browser-local replacement database.

Read [the deployment guide](docs/deployment.md) for Supabase, email, Vercel, testing and backup setup.

## Checks

- `npm test`: the actual business API against embedded PostgreSQL (PGlite), running the committed PostgreSQL migration and stock triggers.
- `npm run typecheck`: TypeScript.
- `npm run test:http`: the built server with missing credentials, checking public pages, safe setup states, protected redirects and CSRF without sending emails.
- `npm run build`: standard Next.js production build.

Tests cover tenant permissions, CSRF, authoritative prices, stale edits, order/swap retries, atomic stock deductions, physical sales, private photo access, quote requirements, stale quotations, and denial of direct business-table access by anonymous/authenticated Data API roles. SQL values are parameterised independently of query text. Lock ordering protects multi-device inventory completion.

The test database stubs the Supabase-managed `auth.users` and `storage.buckets` schemas needed by the initial migration, then applies the Clerk ownership migration. Clerk email/Google flows, real Storage policies and the real pooler still require project-level checks before launch.

Read [the source map and design notes](docs/architecture.md) before changing business flows. Run `npm run format` to format source and `npm run format:check` to check formatting. CI enforces the same convention.

## Architecture

- `src/server/api/`: server-only use of the existing tested order, inventory and swap logic.
- `src/lib/database.mjs`: parameterised PostgreSQL adapter with transactional batches.
- `src/lib/database-server.ts`: server-only connection to Supabase's transaction pooler, prepared statements disabled.
- `supabase/migrations/202610220001_platform.sql`: business tables, constraints, atomic stock triggers, direct-access restrictions, and private photo buckets.
- `supabase/migrations/202610230001_clerk_owners.sql`: text owner IDs for Clerk, preserving legacy owner values without automatic reassignment.
- `src/lib/auth.ts`, `src/proxy.ts`: Clerk sessions and independently verified identities. No authentication headers from callers are trusted.
- `src/lib/supabase/storage.ts`: server-side image uploads/downloads. Trade-in photos require store ownership before they are served.

Business-table access is revoked from Supabase's `anon` and `authenticated` roles and RLS is enabled. All business queries go through server APIs that verify seller ownership. Database credentials and the Supabase secret key must never be browser-exposed. Product and request IDs are unguessable UUIDs, but IDs are not treated as authorization.

For Vercel request limits, uploads are capped at 2 MB per photo and 3 MB total for swap submissions. Order/swap submissions do not reserve stock. Explicit seller completion checks current stock/prices, deducts stock once and records history. Trade-ins require physical inspection and must be added as new listings manually after acquisition. Colours currently share stock within a configuration; independent colour stock needs separate listings.

## Current status

Code, migration, account flows, CI and Vercel build configuration are prepared. Live Clerk, Supabase and Vercel configuration must be verified before launch. Production email verification/recovery delivery, real Storage uploads and deployment are not yet verified. Do not represent this as a fully launched production service until the deployment acceptance checks pass.

WhatsApp Business automation, payments, subscription billing, staff memberships and automated delivery tracking are outside this release. Customer messages still require tapping Send in WhatsApp.

## Existing preview data

Do not run the old SQLite migrations against Supabase. This PostgreSQL migration creates a new database. Any data worth preserving from the preview must be exported, reviewed and imported deliberately, with seller ownership explicitly mapped to Clerk user IDs and photo objects copied separately. Nothing is silently migrated.

## Assets

The original generated gadget hero and illustrative Unsplash catalogue photos are retained. Replace sample products and photos with verified seller listings before selling. Fonts are DM Sans and Manrope, with local system fallbacks.
