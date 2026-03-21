
-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pipeline_jobs table
CREATE TABLE public.pipeline_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 50,
  expected_payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'lead',
  konto INTEGER NOT NULL DEFAULT 1010,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (single-user app, no auth yet)
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pipeline_jobs" ON public.pipeline_jobs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_pipeline_jobs_customer ON public.pipeline_jobs(customer_id);
CREATE INDEX idx_pipeline_jobs_date ON public.pipeline_jobs(expected_payment_date);
CREATE INDEX idx_pipeline_jobs_status ON public.pipeline_jobs(status);
