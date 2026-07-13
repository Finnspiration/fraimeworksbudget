
-- 1. Restrict profiles SELECT
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for trigger" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Safe directory view for approved users (id, name, approved only)
CREATE OR REPLACE VIEW public.profiles_directory
WITH (security_invoker = on) AS
SELECT id, name, approved
FROM public.profiles
WHERE approved = true;

GRANT SELECT ON public.profiles_directory TO authenticated;

-- Allow view queries to see approved rows regardless of ownership.
CREATE POLICY "Approved users visible in directory"
  ON public.profiles FOR SELECT TO authenticated
  USING (approved = true AND public.is_approved(auth.uid()));

-- 3. Lock down SECURITY DEFINER helper functions from anon/public
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_channel_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid, uuid) TO authenticated;
