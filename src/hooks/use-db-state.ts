import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  INIT_TXN, INIT_BUDGET, INIT_BSKAT, INIT_BSKAT_SELSKAB, PL,
  type Transaction, type BskatRate, type PLRow, YEAR,
} from '@/data/budget-constants';
import { computeRealized, computePL, computeDynamicBudget } from '@/lib/budget-utils';

// ─── helpers ───────────────────────────────────────────────────────
function plRowToDb(row: PLRow, i: number) {
  return {
    sort_order: i,
    row_type: row.t,
    label: row.lbl ?? null,
    nr: row.nr ?? null,
    grp: row.grp ?? null,
    row_id: row.id ?? null,
    sum_formula: row.sum ?? null,
    moms: row.moms ?? null,
  };
}

function dbToPlRow(r: any): PLRow {
  const row: PLRow = { t: r.row_type };
  if (r.label) row.lbl = r.label;
  if (r.nr != null) row.nr = r.nr;
  if (r.grp) row.grp = r.grp;
  if (r.row_id) row.id = r.row_id;
  if (r.sum_formula) row.sum = r.sum_formula;
  if (r.moms) row.moms = r.moms;
  return row;
}

function budgetToEntries(budget: Record<number, number[]>) {
  const entries: { konto: number; month_index: number; amount: number }[] = [];
  for (const [k, arr] of Object.entries(budget)) {
    arr.forEach((v, i) => {
      if (v !== 0) entries.push({ konto: Number(k), month_index: i, amount: v });
    });
  }
  return entries;
}

function entriesToBudget(entries: { konto: number; month_index: number; amount: number }[]): Record<number, number[]> {
  const b: Record<number, number[]> = {};
  for (const e of entries) {
    if (!b[e.konto]) b[e.konto] = new Array(12).fill(0);
    b[e.konto][e.month_index] = Number(e.amount);
  }
  return b;
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  return data ? (data.value as T) : fallback;
}

async function setSetting(key: string, value: any) {
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
}

// ─── seed logic ────────────────────────────────────────────────────
async function seedIfEmpty() {
  // Check transactions
  const { count: txnCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  if (txnCount === 0) {
    // Try migrate from localStorage first
    const lsTxns = localStorage.getItem('vs_txns');
    const txnsToInsert = lsTxns ? JSON.parse(lsTxns) : INIT_TXN;
    const rows = txnsToInsert.map((t: Transaction) => ({
      dato: t.dato || null,
      type: t.type,
      bilag: String(t.bilag),
      tekst: t.tekst,
      belob: t.belob,
      konto: t.konto,
      moms: t.moms,
      modkonto: t.modkonto ?? null,
      faktura: t.faktura ?? null,
    }));
    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from('transactions').insert(rows.slice(i, i + 50));
    }
  }

  // Check budget
  const { count: budgetCount } = await supabase.from('budget_entries').select('*', { count: 'exact', head: true });
  if (budgetCount === 0) {
    const lsBudget = localStorage.getItem('vs_budget');
    const budgetData = lsBudget ? JSON.parse(lsBudget) : INIT_BUDGET;
    const entries = budgetToEntries(budgetData);
    for (let i = 0; i < entries.length; i += 50) {
      await supabase.from('budget_entries').insert(entries.slice(i, i + 50));
    }
  }

  // Check chart of accounts
  const { count: coaCount } = await supabase.from('chart_of_accounts').select('*', { count: 'exact', head: true });
  if (coaCount === 0) {
    const lsPL = localStorage.getItem('vs_custompl');
    const plData = lsPL ? JSON.parse(lsPL) : null;
    if (plData) {
      const rows = plData.map((r: PLRow, i: number) => plRowToDb(r, i));
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from('chart_of_accounts').insert(rows.slice(i, i + 50));
      }
    }
    // If no custom PL was in localStorage, we don't seed — we use the hardcoded PL as fallback
  }

  // Check settings
  const { count: settingsCount } = await supabase.from('settings').select('*', { count: 'exact', head: true });
  if (settingsCount === 0) {
    const settings = [
      { key: 'n_real', value: JSON.parse(localStorage.getItem('vs_nreal') || '2') },
      { key: 'skat_pct', value: JSON.parse(localStorage.getItem('vs_skatpct') || '22') },
      { key: 'budget_mode', value: JSON.parse(localStorage.getItem('vs_budgetmode') || '"fixed"') },
      { key: 'virksomhedstype', value: JSON.parse(localStorage.getItem('vs_vtype') || '"personlig"') },
      { key: 'anden_geld', value: JSON.parse(localStorage.getItem('vs_andengeld') || '0') },
    ];
    await supabase.from('settings').insert(settings);
  }

  // Check bskat
  const { count: bskatCount } = await supabase.from('bskat_rates').select('*', { count: 'exact', head: true });
  if (bskatCount === 0) {
    const lsBskat = localStorage.getItem('vs_bskat');
    const bskatData: BskatRate[] = lsBskat ? JSON.parse(lsBskat) : INIT_BSKAT;
    await supabase.from('bskat_rates').insert(
      bskatData.map(r => ({ id: r.id, belob: r.belob, forfald: r.forfald, betalt: r.betalt, betalt_dato: r.betaltDato || '' }))
    );
  }

  // Check moms
  const { count: momsCount } = await supabase.from('moms_betalt').select('*', { count: 'exact', head: true });
  if (momsCount === 0) {
    const lsMoms = localStorage.getItem('vs_moms');
    const momsData: number[] = lsMoms ? JSON.parse(lsMoms) : [0, 0, 0, 0];
    await supabase.from('moms_betalt').insert(
      momsData.map((v, i) => ({ quarter: i + 1, amount: v }))
    );
  }
}

// ─── main hook ─────────────────────────────────────────────────────
export function useDbState() {
  const qc = useQueryClient();
  const [seeded, setSeeded] = useState(false);

  // Seed on mount
  useEffect(() => {
    seedIfEmpty().then(() => setSeeded(true));
  }, []);

  // ── Transactions ──
  const { data: txns = [] } = useQuery({
    queryKey: ['db_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('id');
      if (error) throw error;
      return data.map(r => ({
        id: r.id,
        dato: r.dato || '',
        type: r.type || '',
        bilag: r.bilag || '',
        tekst: r.tekst || '',
        belob: Number(r.belob),
        konto: r.konto,
        moms: r.moms,
        modkonto: r.modkonto ?? undefined,
        faktura: r.faktura ?? undefined,
        customer_id: r.customer_id ?? null,
      })) as Transaction[];
    },
    enabled: seeded,
  });

  const setTxns: React.Dispatch<React.SetStateAction<Transaction[]>> = useCallback((action) => {
    const prev = (qc.getQueryData(['db_transactions']) as Transaction[]) || [];
    const newTxns = typeof action === 'function' ? action(prev) : action;
    qc.setQueryData(['db_transactions'], newTxns);
    (async () => {
      const toDbRow = (t: Transaction) => ({
        dato: t.dato || null,
        type: t.type,
        bilag: String(t.bilag),
        tekst: t.tekst,
        belob: t.belob,
        konto: t.konto,
        moms: t.moms,
        modkonto: t.modkonto ?? null,
        faktura: t.faktura ?? null,
        customer_id: t.customer_id ?? null,
      });
      const prevById = new Map<any, Transaction>();
      for (const t of prev) if (t.id != null) prevById.set(t.id, t);
      const newIds = new Set<any>();
      const toInsert: Transaction[] = [];
      const toUpdate: Transaction[] = [];
      for (const t of newTxns) {
        if (t.id == null) { toInsert.push(t); continue; }
        newIds.add(t.id);
        const p = prevById.get(t.id);
        if (!p) { toInsert.push(t); continue; }
        // shallow compare relevant fields
        if (
          p.dato !== t.dato || p.type !== t.type || String(p.bilag) !== String(t.bilag) ||
          p.tekst !== t.tekst || Number(p.belob) !== Number(t.belob) || p.konto !== t.konto ||
          p.moms !== t.moms || (p.modkonto ?? null) !== (t.modkonto ?? null) ||
          (p.faktura ?? null) !== (t.faktura ?? null) ||
          ((p as any).customer_id ?? null) !== ((t as any).customer_id ?? null)
        ) {
          toUpdate.push(t);
        }
      }
      const toDeleteIds: any[] = [];
      for (const t of prev) if (t.id != null && !newIds.has(t.id)) toDeleteIds.push(t.id);

      try {
        // Deletes
        if (toDeleteIds.length) {
          await supabase.from('transactions').delete().in('id', toDeleteIds);
        }
        // Updates
        for (const t of toUpdate) {
          await supabase.from('transactions').update(toDbRow(t)).eq('id', t.id);
        }
        // Inserts (batched, capture generated ids)
        if (toInsert.length) {
          const rows = toInsert.map(toDbRow);
          for (let i = 0; i < rows.length; i += 50) {
            await supabase.from('transactions').insert(rows.slice(i, i + 50));
          }
        }
      } finally {
        qc.invalidateQueries({ queryKey: ['db_transactions'] });
      }
    })();
  }, [qc]);

  // ── Budget ──
  const { data: budget = {} as Record<number, number[]> } = useQuery({
    queryKey: ['db_budget'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budget_entries').select('*');
      if (error) throw error;
      return entriesToBudget(data as any[]);
    },
    enabled: seeded,
  });

  const setBudget: React.Dispatch<React.SetStateAction<Record<number, number[]>>> = useCallback((action) => {
    const prev = qc.getQueryData(['db_budget']) as Record<number, number[]> || {};
    const newBudget = typeof action === 'function' ? action(prev) : action;
    qc.setQueryData(['db_budget'], newBudget);
    (async () => {
      await supabase.from('budget_entries').delete().gte('month_index', 0);
      const entries = budgetToEntries(newBudget);
      for (let i = 0; i < entries.length; i += 50) {
        await supabase.from('budget_entries').insert(entries.slice(i, i + 50));
      }
    })();
  }, [qc]);

  // ── Chart of accounts (custom PL) ──
  const { data: customPL = null } = useQuery({
    queryKey: ['db_chart_of_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').order('sort_order');
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data.map(dbToPlRow) as PLRow[];
    },
    enabled: seeded,
  });

  const setCustomPL: React.Dispatch<React.SetStateAction<PLRow[] | null>> = useCallback((action) => {
    const prev = qc.getQueryData(['db_chart_of_accounts']) as PLRow[] | null;
    const newPL = typeof action === 'function' ? action(prev) : action;
    qc.setQueryData(['db_chart_of_accounts'], newPL);
    (async () => {
      // Delete all rows
      await supabase.from('chart_of_accounts').delete().gte('sort_order', 0);
      if (newPL) {
        const rows = newPL.map((r, i) => plRowToDb(r, i));
        for (let i = 0; i < rows.length; i += 50) {
          await supabase.from('chart_of_accounts').insert(rows.slice(i, i + 50));
        }
      }
    })();
  }, [qc]);

  // ── Settings ──
  const { data: settings } = useQuery({
    queryKey: ['db_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const r of data || []) map[r.key] = r.value;
      return map;
    },
    enabled: seeded,
  });

  const nReal = (settings?.n_real ?? 2) as number;
  const skatPct = (settings?.skat_pct ?? 22) as number;
  const budgetMode = (settings?.budget_mode ?? 'fixed') as 'fixed' | 'dynamic';
  const virksomhedstype = (settings?.virksomhedstype ?? 'personlig') as 'personlig' | 'selskab';
  const andenGeld = (settings?.anden_geld ?? 0) as number;

  const updateSetting = useCallback((key: string, value: any) => {
    qc.setQueryData(['db_settings'], (prev: Record<string, any> | undefined) => ({ ...(prev || {}), [key]: value }));
    setSetting(key, value);
  }, [qc]);

  const setNReal = useCallback((v: number) => updateSetting('n_real', v), [updateSetting]);
  const setSkatPct = useCallback((v: number) => updateSetting('skat_pct', v), [updateSetting]);
  const setBudgetMode = useCallback((v: 'fixed' | 'dynamic') => updateSetting('budget_mode', v), [updateSetting]);
  const setAndenGeld = useCallback((v: number) => updateSetting('anden_geld', v), [updateSetting]);

  // ── B-skat ──
  const { data: bskat = INIT_BSKAT } = useQuery({
    queryKey: ['db_bskat'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bskat_rates').select('*').order('id');
      if (error) throw error;
      if (!data || data.length === 0) return INIT_BSKAT;
      return data.map(r => ({
        id: r.id,
        belob: Number(r.belob),
        forfald: r.forfald || '',
        betalt: Number(r.betalt),
        betaltDato: r.betalt_dato || '',
      })) as BskatRate[];
    },
    enabled: seeded,
  });

  const setBskat: React.Dispatch<React.SetStateAction<BskatRate[]>> = useCallback((action) => {
    const prev = qc.getQueryData(['db_bskat']) as BskatRate[] || INIT_BSKAT;
    const newBskat = typeof action === 'function' ? action(prev) : action;
    qc.setQueryData(['db_bskat'], newBskat);
    (async () => {
      for (const r of newBskat) {
        await supabase.from('bskat_rates').upsert({
          id: r.id, belob: r.belob, forfald: r.forfald, betalt: r.betalt, betalt_dato: r.betaltDato,
        }, { onConflict: 'id' });
      }
    })();
  }, [qc]);

  // ── Moms ──
  const { data: momsBetalt = [0, 0, 0, 0] } = useQuery({
    queryKey: ['db_moms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('moms_betalt').select('*').order('quarter');
      if (error) throw error;
      if (!data || data.length === 0) return [0, 0, 0, 0];
      const arr = [0, 0, 0, 0];
      for (const r of data) arr[r.quarter - 1] = Number(r.amount);
      return arr;
    },
    enabled: seeded,
  });

  const setMomsBetalt: React.Dispatch<React.SetStateAction<number[]>> = useCallback((action) => {
    const prev = qc.getQueryData(['db_moms']) as number[] || [0, 0, 0, 0];
    const newMoms = typeof action === 'function' ? action(prev) : action;
    qc.setQueryData(['db_moms'], newMoms);
    (async () => {
      for (let i = 0; i < 4; i++) {
        await supabase.from('moms_betalt').upsert({ quarter: i + 1, amount: newMoms[i] || 0 }, { onConflict: 'quarter' });
      }
    })();
  }, [qc]);

  // ── Virksomhedstype change handler ──
  const handleVirksomhedstypeChange = useCallback((type: 'personlig' | 'selskab') => {
    updateSetting('virksomhedstype', type);
    const newBskat = type === 'selskab' ? INIT_BSKAT_SELSKAB : INIT_BSKAT;
    qc.setQueryData(['db_bskat'], newBskat);
    (async () => {
      await supabase.from('bskat_rates').delete().gte('id', 0);
      await supabase.from('bskat_rates').insert(
        newBskat.map(r => ({ id: r.id, belob: r.belob, forfald: r.forfald, betalt: r.betalt, betalt_dato: r.betaltDato }))
      );
    })();
    if (type === 'selskab') updateSetting('skat_pct', 22);
  }, [qc, updateSetting]);

  // ── Computed values ──
  const activePL = customPL ?? PL;
  const realized = useMemo(() => computeRealized(txns, YEAR, activePL), [txns, activePL]);
  const dynamicBudget = useMemo(() => computeDynamicBudget(realized, nReal, activePL), [realized, nReal, activePL]);
  const activeBudget = budgetMode === 'dynamic' ? dynamicBudget : budget;
  const pl = useMemo(() => computePL(realized, activeBudget, activePL), [realized, activeBudget, activePL]);

  const resetAll = useCallback(() => {
    setTxns(INIT_TXN);
    setBudget(INIT_BUDGET);
    setNReal(2);
    setMomsBetalt([0, 0, 0, 0]);
    setBskat(INIT_BSKAT);
    setAndenGeld(0);
    setSkatPct(22);
  }, [setTxns, setBudget, setNReal, setMomsBetalt, setBskat, setAndenGeld, setSkatPct]);

  return {
    txns, setTxns,
    budget, setBudget, activeBudget,
    nReal, setNReal,
    momsBetalt, setMomsBetalt,
    bskat, setBskat,
    andenGeld, setAndenGeld,
    skatPct, setSkatPct,
    budgetMode, setBudgetMode,
    customPL, setCustomPL, activePL,
    virksomhedstype, setVirksomhedstype: handleVirksomhedstypeChange,
    pl, realized,
    resetAll,
    isLoading: !seeded,
  };
}
