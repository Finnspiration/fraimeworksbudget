CREATE TABLE public.future_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dato date,
  tekst text,
  belob numeric NOT NULL DEFAULT 0,
  konto integer NOT NULL,
  moms text,
  bilag text,
  modkonto integer,
  faktura text,
  matched boolean NOT NULL DEFAULT false,
  matched_txn_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.future_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to future_expenses" ON public.future_expenses FOR ALL TO public USING (true) WITH CHECK (true);