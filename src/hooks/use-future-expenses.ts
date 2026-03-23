import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Transaction } from '@/data/budget-constants';

export interface FutureExpense {
  id: string;
  dato: string;
  tekst: string;
  belob: number;
  konto: number;
  moms: string | null;
  bilag: string | null;
  modkonto: number | null;
  faktura: string | null;
  matched: boolean;
  matched_txn_id: number | null;
  created_at: string;
}

export function useFutureExpenses() {
  const qc = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['future_expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('future_expenses')
        .select('*')
        .order('dato');
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        dato: r.dato || '',
        tekst: r.tekst || '',
        belob: Number(r.belob),
        konto: r.konto,
        moms: r.moms,
        bilag: r.bilag,
        modkonto: r.modkonto,
        faktura: r.faktura,
        matched: r.matched,
        matched_txn_id: r.matched_txn_id,
        created_at: r.created_at,
      })) as FutureExpense[];
    },
  });

  const addExpense = useCallback(async (expense: Omit<FutureExpense, 'id' | 'matched' | 'matched_txn_id' | 'created_at'>) => {
    const { error } = await supabase.from('future_expenses').insert({
      dato: expense.dato || null,
      tekst: expense.tekst,
      belob: expense.belob,
      konto: expense.konto,
      moms: expense.moms,
      bilag: expense.bilag,
      modkonto: expense.modkonto,
      faktura: expense.faktura,
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['future_expenses'] });
  }, [qc]);

  const updateExpense = useCallback(async (id: string, updates: Partial<FutureExpense>) => {
    const { error } = await supabase.from('future_expenses').update({
      ...(updates.dato !== undefined && { dato: updates.dato || null }),
      ...(updates.tekst !== undefined && { tekst: updates.tekst }),
      ...(updates.belob !== undefined && { belob: updates.belob }),
      ...(updates.konto !== undefined && { konto: updates.konto }),
      ...(updates.moms !== undefined && { moms: updates.moms }),
      ...(updates.bilag !== undefined && { bilag: updates.bilag }),
      ...(updates.modkonto !== undefined && { modkonto: updates.modkonto }),
      ...(updates.faktura !== undefined && { faktura: updates.faktura }),
      ...(updates.matched !== undefined && { matched: updates.matched }),
      ...(updates.matched_txn_id !== undefined && { matched_txn_id: updates.matched_txn_id }),
    }).eq('id', id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['future_expenses'] });
  }, [qc]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('future_expenses').delete().eq('id', id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['future_expenses'] });
  }, [qc]);

  const unmatchExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('future_expenses').update({
      matched: false,
      matched_txn_id: null,
    }).eq('id', id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['future_expenses'] });
  }, [qc]);

  const matchAgainstTransactions = useCallback(async (txns: Transaction[]) => {
    const unmatched = expenses.filter(e => !e.matched);
    if (unmatched.length === 0) return 0;

    let matchCount = 0;
    for (const exp of unmatched) {
      const match = txns.find(txn => {
        if (txn.konto !== exp.konto) return false;
        if (Math.abs(txn.belob - exp.belob) > 1) return false;
        if (!exp.dato || !txn.dato) return true; // If no date, match on konto+beløb only
        const expDate = new Date(exp.dato);
        const txnDate = new Date(txn.dato);
        const diffDays = Math.abs((expDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      });
      if (match) {
        await supabase.from('future_expenses').update({
          matched: true,
          matched_txn_id: match.id,
        }).eq('id', exp.id);
        matchCount++;
      }
    }
    if (matchCount > 0) {
      qc.invalidateQueries({ queryKey: ['future_expenses'] });
    }
    return matchCount;
  }, [expenses, qc]);

  const activeExpenses = expenses.filter(e => !e.matched);

  return {
    expenses,
    activeExpenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    matchAgainstTransactions,
  };
}
