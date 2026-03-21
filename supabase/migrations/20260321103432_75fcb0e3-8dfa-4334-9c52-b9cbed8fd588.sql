
-- Transactions (kassekladde)
CREATE TABLE public.transactions (
  id serial PRIMARY KEY,
  dato date,
  type text,
  bilag text,
  tekst text,
  belob numeric NOT NULL DEFAULT 0,
  konto integer NOT NULL,
  moms text,
  modkonto integer,
  faktura text
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Budget entries
CREATE TABLE public.budget_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  konto integer NOT NULL,
  month_index integer NOT NULL CHECK (month_index >= 0 AND month_index <= 11),
  amount numeric NOT NULL DEFAULT 0,
  UNIQUE(konto, month_index)
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to budget_entries" ON public.budget_entries FOR ALL USING (true) WITH CHECK (true);

-- Chart of accounts (PLRow)
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL,
  row_type text NOT NULL,
  label text,
  nr integer,
  grp text,
  row_id text,
  sum_formula text
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to chart_of_accounts" ON public.chart_of_accounts FOR ALL USING (true) WITH CHECK (true);

-- Settings (key-value)
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- B-skat rates
CREATE TABLE public.bskat_rates (
  id integer PRIMARY KEY,
  belob numeric NOT NULL DEFAULT 0,
  forfald text,
  betalt numeric NOT NULL DEFAULT 0,
  betalt_dato text
);
ALTER TABLE public.bskat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bskat_rates" ON public.bskat_rates FOR ALL USING (true) WITH CHECK (true);

-- Moms betalt per quarter
CREATE TABLE public.moms_betalt (
  quarter integer PRIMARY KEY CHECK (quarter >= 1 AND quarter <= 4),
  amount numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.moms_betalt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to moms_betalt" ON public.moms_betalt FOR ALL USING (true) WITH CHECK (true);
