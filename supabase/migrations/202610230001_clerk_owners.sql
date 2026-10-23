BEGIN;
-- Preserve all existing ownership values. Clerk's user_ identifiers are text.
-- Old Supabase UUID owners remain unclaimed until explicitly mapped by an admin.
ALTER TABLE public.stores DROP CONSTRAINT stores_owner_id_fkey;
ALTER TABLE public.stores ALTER COLUMN owner_id TYPE text USING owner_id::text;
COMMIT;
