# Supabase data and Storage

Apply migrations in filename order for a new database. Existing databases with the first migration need only 202610230001_clerk_owners.sql. Applied migrations are append-only.

Clerk handles authentication; Supabase handles database records and private photo buckets. The Clerk migration preserves old store owner IDs and allows new Clerk IDs. Existing ownership must be explicitly verified and mapped by an administrator. See ../SETUP.md and ../docs/deployment.md.
