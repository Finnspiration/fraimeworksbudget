DO $$
DECLARE
  t text;
  tables text[] := ARRAY['transactions','budget_entries','chart_of_accounts','settings','bskat_rates','moms_betalt','customers','pipeline_jobs','future_expenses'];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop ALL existing policies on the table
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Approved users full access" ON public.%I FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()))', t);
    -- Revoke anon access, keep authenticated + service_role
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;