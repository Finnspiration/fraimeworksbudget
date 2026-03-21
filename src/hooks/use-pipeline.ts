import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Customer {
  id: string;
  name: string;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
}

export interface PipelineJob {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  probability: number;
  expected_payment_date: string;
  status: string;
  konto: number;
  notes: string | null;
  created_at: string;
}

export interface PipelineJobWithCustomer extends PipelineJob {
  customers: { name: string } | null;
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function usePipelineJobs() {
  return useQuery({
    queryKey: ['pipeline_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_jobs')
        .select('*, customers(name)')
        .order('expected_payment_date');
      if (error) throw error;
      return data as PipelineJobWithCustomer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { name: string; contact_email?: string; notes?: string }) => {
      const { data, error } = await supabase.from('customers').insert(c).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['pipeline_jobs'] });
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (j: Omit<PipelineJob, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('pipeline_jobs').insert(j).select('*, customers(name)').single();
      if (error) throw error;
      return data as PipelineJobWithCustomer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline_jobs'] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineJob> & { id: string }) => {
      const { error } = await supabase.from('pipeline_jobs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline_jobs'] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline_jobs'] }),
  });
}
