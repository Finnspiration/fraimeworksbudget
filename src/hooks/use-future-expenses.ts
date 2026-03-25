import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeMatchScore } from '@/lib/budget-utils';
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

export interface MatchCandidate {
  expense: FutureExpense;
  bestMatch: { txn: Transaction; score: number } | null;
  allCandidates: { txn: Transaction; score: number }[];
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

  /**
   * Find match candidates for all unmatched expenses whose date <= latest txn date.
   * Returns scored candidates sorted by best match score.
   */
  const findMatchCandidates = useCallback((txns: Transaction[]): MatchCandidate[] => {
    const unmatched = expenses.filter(e => !e.matched);
    if (unmatched.length === 0 || txns.length === 0) return [];

    // Find latest transaction date
    const latestTxnDate = txns.reduce((max, t) => {
      if (!t.dato) return max;
      return t.dato > max ? t.dato : max;
    }, '');

    // Track which txn IDs have already been claimed (best-match-first)
    const usedTxnIds = new Set<number>();

    const results: MatchCandidate[] = [];

    // First pass: compute all candidates
    for (const exp of unmatched) {
      // Only match expenses with dato <= latest txn date
      if (!exp.dato || exp.dato > latestTxnDate) continue;

      const candidates: { txn: Transaction; score: number }[] = [];
      for (const txn of txns) {
        const score = computeMatchScore(
          { konto: exp.konto, belob: exp.belob, dato: exp.dato, tekst: exp.tekst },
          { konto: txn.konto, belob: txn.belob, dato: txn.dato, tekst: txn.tekst }
        );
        if (score >= 10) {
          candidates.push({ txn, score });
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      results.push({ expense: exp, bestMatch: null, allCandidates: candidates });
    }

    // Second pass: assign best non-conflicting match
    // Sort by highest best-candidate score first for greedy assignment
    results.sort((a, b) => {
      const aTop = a.allCandidates[0]?.score || 0;
      const bTop = b.allCandidates[0]?.score || 0;
      return bTop - aTop;
    });

    for (const r of results) {
      for (const c of r.allCandidates) {
        if (!usedTxnIds.has(c.txn.id)) {
          r.bestMatch = c;
          usedTxnIds.add(c.txn.id);
          break;
        }
      }
    }

    return results.filter(r => r.bestMatch !== null);
  }, [expenses]);

  /**
   * Match a single expense to a specific transaction.
   */
  const matchExpenseToTxn = useCallback(async (expenseId: string, txnId: number) => {
    const { error } = await supabase.from('future_expenses').update({
      matched: true,
      matched_txn_id: txnId,
    }).eq('id', expenseId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['future_expenses'] });
  }, [qc]);

  /**
   * Legacy: auto-match with old strict logic (kept for import flow).
   */
  const matchAgainstTransactions = useCallback(async (txns: Transaction[]) => {
    const unmatched = expenses.filter(e => !e.matched);
    if (unmatched.length === 0) return 0;

    let matchCount = 0;
    for (const exp of unmatched) {
      const match = txns.find(txn => {
        if (txn.konto !== exp.konto) return false;
        if (Math.abs(txn.belob - exp.belob) > 1) return false;
        if (!exp.dato || !txn.dato) return false;
        const expDate = new Date(exp.dato);
        const txnDate = new Date(txn.dato);
        if (txnDate > expDate) return false;
        const diffDays = (expDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
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
    unmatchExpense,
    matchAgainstTransactions,
    findMatchCandidates,
    matchExpenseToTxn,
  };
}
