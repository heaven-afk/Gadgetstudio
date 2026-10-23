# Connect Clerk and Supabase

Clerk handles seller accounts: email/password registration, verification, Google sign-in, recovery and sessions. Supabase handles PostgreSQL and private product/trade-in photos. Customers browse and submit requests without accounts.

## Environment

Fill the ignored .env.local in this directory. Never paste secrets into chat or commit them.

| Variable                          | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| NEXT_PUBLIC_SITE_URL              | http://127.0.0.1:3000 locally; canonical HTTPS origin in production |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk development publishable key; use production key on production |
| CLERK_SECRET_KEY                  | Matching Clerk server secret                                        |
| NEXT_PUBLIC_SUPABASE_URL          | Supabase project URL for Storage                                    |
| SUPABASE_SECRET_KEY               | Server-only Supabase Storage secret/service-role key                |
| DATABASE_URL                      | Supabase transaction pooler URI, with URL-encoded database password |

Supabase's publishable/anon key is no longer used for authentication. Do not remove the project URL or server secret needed for private Storage.

## Clerk dashboard

Create a development application. Under User & authentication, enable email signup/sign-in, required verified email and password signup. Under SSO connections, enable Google for signup and sign-in. Shared Google credentials work for development; production requires your own OAuth credentials and Clerk's callback URL. Do not use the old Supabase callback in Google configuration.

The app embeds Clerk's account components in the existing animated account shell. Verification, resend, password reset, Google callback and account linking run through Clerk. /forgot-password opens the Clerk sign-in component with its Forgot password flow. /update-password opens Clerk's signed-in profile/security controls. Existing Supabase email links redirect to sign-in and no longer create sessions.

## Database migrations

For a new Supabase database, apply both SQL files in order:

1. supabase/migrations/202610220001_platform.sql
2. supabase/migrations/202610230001_clerk_owners.sql

For a database that already has the first migration, apply only the second. Do not rerun applied migrations. The second changes store owner IDs to text and removes the Supabase Auth foreign key; it preserves inventory, requests, photos and old owner values.

Existing stores are NOT automatically assigned to Clerk accounts. An administrator must verify the old seller and new Clerk user ID, then deliberately update the relevant stores' owner_id. Never claim ownership based only on a matching email. Supabase passwords and sessions are not migrated to Clerk. Sellers register in Clerk and create a new password or use Google.

## Run

Use Node.js 24. Run npm ci, then npm run dev from this directory. Open http://127.0.0.1:3000/sign-up. Create a test account, complete Clerk verification and create a store. Test sign-out and returning sign-in, then Google signup and sign-in. Do not start another account flow in a different tab before completing the first.

The app fails closed if Clerk keys are missing. Account screens show a setup message; anonymous catalogue browsing remains available if Supabase is connected.

See docs/deployment.md for the launch checklist.
