
-- Recreate view as security invoker (safe: default view semantics honor caller RLS)
DROP VIEW IF EXISTS public.profiles_directory;

CREATE VIEW public.profiles_directory
WITH (security_invoker = on) AS
SELECT id, name, approved
FROM public.profiles
WHERE approved = true;

REVOKE ALL ON public.profiles_directory FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_directory TO authenticated;

-- Row policy: approved users may SELECT any approved profile row (needed for directory view).
-- Sensitive columns are protected below via column-level privileges.
CREATE POLICY "Approved users can see approved profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (approved = true AND public.is_approved(auth.uid()));

-- Column-level privilege lockdown: authenticated role can only SELECT the safe columns.
-- Users still need to read their own magic_token/magic_link/email — handled via SECURITY DEFINER
-- helper below. Admins get full profile access via the admin-only helper as well.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, approved, created_at) ON public.profiles TO authenticated;

-- Helper: return full profile for the caller themselves, or (for admins) any user.
CREATE OR REPLACE FUNCTION public.get_profile_full(_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  approved boolean,
  created_at timestamptz,
  email text,
  magic_link text,
  magic_token uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.approved, p.created_at, p.email, p.magic_link, p.magic_token
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
$$;

REVOKE ALL ON FUNCTION public.get_profile_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_full(uuid) TO authenticated;

-- Helper: admin-only listing of all profiles with sensitive fields
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  approved boolean,
  created_at timestamptz,
  email text,
  magic_link text,
  magic_token uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.approved, p.created_at, p.email, p.magic_link, p.magic_token
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY p.created_at;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
