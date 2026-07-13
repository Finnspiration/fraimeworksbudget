
-- Remove overly broad policy that re-exposed all approved profile rows (incl. magic_token)
DROP POLICY IF EXISTS "Approved users visible in directory" ON public.profiles;

-- Rebuild directory view as SECURITY DEFINER (owner-run) so approved users can look up names
-- without needing SELECT on the base table.
DROP VIEW IF EXISTS public.profiles_directory;

CREATE VIEW public.profiles_directory AS
SELECT id, name, approved
FROM public.profiles
WHERE approved = true;

REVOKE ALL ON public.profiles_directory FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_directory TO authenticated;
