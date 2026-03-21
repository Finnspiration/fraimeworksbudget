import { useState, useMemo, useEffect, useCallback } from 'react';
import { INIT_TXN, INIT_BUDGET, INIT_BSKAT, INIT_BSKAT_SELSKAB, PL, type Transaction, type BskatRate, type PLRow } from '@/data/budget-constants';
import { computeRealized, computePL, computeDynamicBudget } from '@/lib/budget-utils';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function useBudgetState() {
  const [txns, setTxns] = useState<Transaction[]>(() => loadJSON('vs_txns', INIT_TXN));
  const [budget, setBudget] = useState<Record<number, number[]>>(() => loadJSON('vs_budget', INIT_BUDGET));
  const [nReal, setNReal] = useState<number>(() => loadJSON('vs_nreal', 2));
  const [momsBetalt, setMomsBetalt] = useState<number[]>(() => loadJSON('vs_moms', [0, 0, 0, 0]));
  const [bskat, setBskat] = useState<BskatRate[]>(() => loadJSON('vs_bskat', INIT_BSKAT));
  const [andenGeld, setAndenGeld] = useState<number>(() => loadJSON('vs_andengeld', 0));
  const [skatPct, setSkatPct] = useState<number>(() => loadJSON('vs_skatpct', 22));
  const [budgetMode, setBudgetMode] = useState<'fixed' | 'dynamic'>(() => loadJSON('vs_budgetmode', 'fixed'));
  const [customPL, setCustomPL] = useState<PLRow[] | null>(() => loadJSON('vs_custompl', null));
  const [virksomhedstype, setVirksomhedstype] = useState<'personlig' | 'selskab'>(() => loadJSON('vs_vtype', 'personlig'));

  useEffect(() => { localStorage.setItem('vs_txns', JSON.stringify(txns)); }, [txns]);
  useEffect(() => { localStorage.setItem('vs_budget', JSON.stringify(budget)); }, [budget]);
  useEffect(() => { localStorage.setItem('vs_nreal', JSON.stringify(nReal)); }, [nReal]);
  useEffect(() => { localStorage.setItem('vs_moms', JSON.stringify(momsBetalt)); }, [momsBetalt]);
  useEffect(() => { localStorage.setItem('vs_bskat', JSON.stringify(bskat)); }, [bskat]);
  useEffect(() => { localStorage.setItem('vs_andengeld', JSON.stringify(andenGeld)); }, [andenGeld]);
  useEffect(() => { localStorage.setItem('vs_skatpct', JSON.stringify(skatPct)); }, [skatPct]);
  useEffect(() => { localStorage.setItem('vs_budgetmode', JSON.stringify(budgetMode)); }, [budgetMode]);
  useEffect(() => { localStorage.setItem('vs_custompl', JSON.stringify(customPL)); }, [customPL]);
  useEffect(() => { localStorage.setItem('vs_vtype', JSON.stringify(virksomhedstype)); }, [virksomhedstype]);

  const activePL = customPL ?? PL;

  const realized = useMemo(() => computeRealized(txns), [txns]);
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
  }, []);

  const handleVirksomhedstypeChange = useCallback((type: 'personlig' | 'selskab') => {
    setVirksomhedstype(type);
    setBskat(type === 'selskab' ? INIT_BSKAT_SELSKAB : INIT_BSKAT);
    if (type === 'selskab') setSkatPct(22);
  }, []);

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
  };
}