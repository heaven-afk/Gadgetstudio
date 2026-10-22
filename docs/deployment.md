# Connect Supabase and Vercel

## 1. Supabase

Create a project under your own account. Choose an appropriate region for your sellers. Save its database password in a password manager, not in the repository or chat.

Apply `supabase/migrations/202610220001_platform.sql` using Supabase's SQL editor, or run `supabase init`, link the intended hosted project with `supabase link --project-ref YOUR_PROJECT_REF`, and run `supabase db push`. Apply it once. Future schema changes require new versioned migrations.

The SQL creates the business tables, stock functions/triggers and two private buckets: `product-assets` and `swap-photos`. No sample seller data is inserted. Do not add public access policies to either bucket or business tables; this app serves data through its own API.

Set these environment variables in Vercel and your ignored local `.env.local`:

| Name                                   | Value                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Your canonical HTTPS application origin; no trailing path                        |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key (or compatible legacy anon key)                          |
| `SUPABASE_SECRET_KEY`                  | Server-only project secret key (or legacy service-role key) for Storage          |
| `DATABASE_URL`                         | Supabase transaction-pooler connection URI, with its actual password URL-encoded |

Use the transaction pooler on its provided port, and keep server-side prepared statements disabled (already configured). Use the credentials from the Supabase Connect dialog. Never prefix database or secret keys with `NEXT_PUBLIC_`.

## 2. Seller authentication and email

Enable email/password authentication and **Confirm email**. Configure a minimum password length of 12 or more and provider abuse limits. Configure production SMTP with your sender/domain and test delivery; development email limits are not a production email service.

Set Supabase's Site URL to the exact value of `NEXT_PUBLIC_SITE_URL`. Add these allowed redirect URLs:

- `https://your-domain/auth/callback`
- `https://your-domain/auth/callback?next=/update-password`
- `http://localhost:3000/auth/callback` for local development
- `http://localhost:3000/auth/callback?next=/update-password` for local recovery testing

For local auth testing, use the exact hostname set in `NEXT_PUBLIC_SITE_URL`: cookies for `localhost` and `127.0.0.1` are not interchangeable.

The app supports the standard PKCE confirmation/recovery links via `/auth/callback`. For token-hash templates that also work across browsers, set the signup email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` and the recovery link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. Keep redirect destinations restricted to your domains. The callback only permits the dashboard or password update page as internal destinations.

## 3. Vercel

Import `https://github.com/heaven-afk/Gadgetstudio` into a Vercel project you own. Select the **Next.js** preset, repository root as the Root Directory, and Node.js 24. The usual commands are `npm ci` and `npm run build`; the app does not use Vinext or Cloudflare bindings.

Add all five environment variables to the appropriate Vercel environments, then deploy. Use separate Supabase projects for development/staging and production so preview deployments cannot modify live stock. Configure a canonical production domain and matching Auth redirect URLs. An unconfigured deployment intentionally shows disabled account forms and rejects database-dependent requests.

GitHub Actions runs tests, type checking and a production build. Enable branch protection for `main` and require these checks before merging later changes. Set Vercel deployment permissions and production controls in your own accounts.

## 4. Acceptance checks before onboarding real sellers

- Register a seller using an email address you control; confirm the actual email and sign in.
- Test password recovery and sign-out on another browser/device.
- Create two real test sellers and ensure neither can access the other's dashboard data, products, requests or trade-in photos.
- Open each `/s/store-slug` link in an incognito session: no customer login should be required.
- Add a product, upload a photo, refresh another device, and verify shared prices and stock.
- Submit an order and a swap with consenting test details. Verify the private photos are inaccessible when signed out.
- Test assessment, quotes, physical-sale recording, stock contention and repeated completion. Stock must not go below zero or deduct twice.
- Check the prepared WhatsApp message and recipient with the actual seller number before sending it.
- Check production errors, email limits, upload limits, rate limiting and monitoring. Add error reporting/alerts suitable for your operations.

## 5. Backups and operational ownership

Select database backups/PITR appropriate to the business and verify restoration into a separate project. Back up the actual Storage objects separately; database backups contain their metadata, not the image files. Document the chosen retention period, who can restore data and how to delete customer records/photos when appropriate. Perform a restore drill before launch.

Record inventory adjustments in the application. Do not manually edit quantities in the database without understanding the history triggers. Migrations are append-only after application. Keep a tested migration rollback/recovery procedure.

## No credentials in Git

`.env*`, dependency directories and build output are ignored. `.env.example` contains names only. Enter live credentials into Vercel/Supabase or a local ignored environment file; do not paste them into messages or commit them.
