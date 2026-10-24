BEGIN;
-- Retain expired rows: deleting one would let an old Clerk session bootstrap again.
CREATE TABLE public.seller_sessions (
  session_id text PRIMARY KEY,
  user_id text NOT NULL,
  expires_at bigint NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
ALTER TABLE public.seller_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_sessions FROM PUBLIC, anon, authenticated;
COMMIT;
