# Deployment: Clerk accounts, Supabase data, Vercel hosting

## Clerk

Configure email/password with verified email and Google in the Clerk development instance. For launch, create/configure the production instance, configure its domain/DNS and production Google OAuth credentials using the callback URL shown by Clerk. Use matching production publishable/secret keys in Vercel. Check allowed origins, email delivery, signup restrictions and session settings in Clerk. Supabase Auth and SMTP are no longer involved in account flows.

## Supabase

Keep the existing project for PostgreSQL and private Storage. Apply migrations in order. If 202610220001_platform.sql is already applied, apply only 202610230001_clerk_owners.sql. Do not edit or rerun applied migrations. See ../SETUP.md for ownership migration details. Database credentials must use the transaction pooler URI; prepared statements are disabled in the app.

Business tables remain inaccessible to Supabase anon/authenticated Data API roles. Clerk sessions are verified by server code and every seller operation checks store ownership. No browser Clerk token is passed directly to the database, and no webhook is needed to create stores. Product assets and trade-in photos remain in private buckets served by the application.

Existing Supabase users and sessions do not become Clerk users. Verify any ownership transfer administratively; legacy stores remain under their original IDs until mapped. Never link stores by email alone.

## Vercel

Use heaven-platform as the app root, Next.js preset and Node.js 24. Set all variables listed in ../SETUP.md with production values. Keep secrets server-only. Use separate development/staging data from production inventory. Set NEXT_PUBLIC_SITE_URL to the canonical HTTPS origin and deploy with npm ci / npm run build.

Writes compare the browser's Origin with the incoming request's Host, so using another valid Vercel deployment address does not prevent store creation. Cross-origin writes are rejected; the canonical URL is not used as a submission allowlist. Test signup and store creation from the actual address shared with sellers, including on mobile.

## Launch acceptance

- Test email/password signup, actual verification delivery, sign-in, reset and sign-out.
- Test Google signup, returning sign-in and cancellation using the production credentials.
- Use two sellers to verify tenant isolation and private photo access.
- If migrating existing data, verify each ownership mapping and inventory after transfer.
- Verify public storefront access without customer login and test mobile/desktop account flows.
- Add a product and photo, submit order/swap requests, quote and complete them; confirm stock deducts once.
- Check the actual seller WhatsApp number and prepared message.
- Configure monitoring, rate limits, Clerk production settings and error reporting.
- Back up PostgreSQL and Storage objects separately and test restoration before launch.

CI runs npm test, npm run typecheck, npm run build and npm run test:http. HTTP smoke tests explicitly disable Clerk and database credentials; they do not send emails or change hosted records. Local passing checks do not verify hosted Clerk delivery, Google OAuth or Supabase services.
