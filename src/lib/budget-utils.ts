import { PL, type Transaction, YEAR } from '@/data/budget-constants';

export interface PLValues {
  r: number[];
  b: number[];
}

function netBelob(belob: number, moms: string | null): number {
  return moms === 'I25' || moms === 'U25' ? belob / 1.25 : Number(belob);
}

export function computeRealized(txns: Transaction[], year: number = YEAR): Record<string, number> {
  const r: Record<string, number> = {};
  txns.forEach(tx => {
    if (!tx.dato) return;
    const d = new Date(tx.dato);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    const m = d.getMonth() + 1;
    const net = netBelob(tx.belob, tx.moms);
    const key = `${tx.konto}-${m}`;
    r[key] = (r[key] || 0) - net;
  });
  return r;
}

export function computePL(realized: Record<string, number>, budget: Record<number, number[]>): Record<string | number, PLValues> {
  const vals: Record<string | number, PLValues> = {};
  PL.filter(x => x.t === 'acct').forEach(x => {
    vals[x.nr!] = {
      r: Array.from({ length: 12 }, (_, i) => realized[`${x.nr}-${i + 1}`] || 0),
      b: Array.from({ length: 12 }, (_, i) => (budget[x.nr!] ? budget[x.nr!][i] : 0) || 0),
    };
  });
  PL.filter(x => ['total', 'res', 'final'].includes(x.t)).forEach(x => {
    const r = new Array(12).fill(0);
    const b = new Array(12).fill(0);
    x.sum!.split('+').forEach(p => {
      p = p.trim();
      if (p.startsWith('grp:')) {
        const g = p.slice(4);
        PL.filter(a => a.t === 'acct' && a.grp === g).forEach(a => {
          vals[a.nr!]?.r.forEach((v, i) => r[i] += v);
          vals[a.nr!]?.b.forEach((v, i) => b[i] += v);
        });
      } else if (p.startsWith('id:')) {
        const id = p.slice(3);
        if (vals[id]) {
          vals[id].r.forEach((v, i) => r[i] += v);
          vals[id].b.forEach((v, i) => b[i] += v);
        }
      }
    });
    vals[x.id!] = { r, b };
  });
  return vals;
}

export function computeDynamicBudget(realized: Record<string, number>, nReal: number): Record<number, number[]> {
  const dynBudget: Record<number, number[]> = {};
  PL.filter(x => x.t === 'acct').forEach(x => {
    const nr = x.nr!;
    const rArr = Array.from({ length: 12 }, (_, i) => realized[`${nr}-${i + 1}`] || 0);
    const avg = nReal > 0 ? rArr.slice(0, nReal).reduce((a, b) => a + b, 0) / nReal : 0;
    dynBudget[nr] = Array.from({ length: 12 }, (_, i) => i < nReal ? rArr[i] : avg);
  });
  return dynBudget;
}

export function fmt(n: number | null | undefined): string {
  if (n === 0 || n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function fmtDec(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function sumArr(arr: number[], from = 0, to = 11): number {
  return arr.slice(from, to + 1).reduce((a, b) => a + b, 0);
}
