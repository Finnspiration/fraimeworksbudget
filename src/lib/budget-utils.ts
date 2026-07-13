import { PL, type PLRow, YEAR } from '@/data/budget-constants';

export interface PLValues {
  r: number[];
  b: number[];
}

function netBelob(belob: number, moms: string | null): number {
  return moms === 'I25' || moms === 'U25' ? belob / 1.25 : Number(belob);
}

/**
 * Build the set of revenue accounts from the PL structure:
 * all 'acct' rows appearing before the first 'total' row (the Omsætning section)
 * plus explicit "other income" accounts (renteindtægter, ekstraordinære indtægter).
 */
function getRevenueAccounts(plRows: PLRow[]): Set<number> {
  const set = new Set<number>([4310, 4360, 4610]);
  for (const row of plRows) {
    if (row.t === 'total') break;
    if (row.t === 'acct' && typeof row.nr === 'number') set.add(row.nr);
  }
  return set;
}

/**
 * Resolve effective moms code for a transaction.
 * Priority: 1) tx.moms  2) account PLRow.moms  3) infer from account label
 */
export function resolveEffectiveMoms(
  txMoms: string | null | undefined,
  konto: number,
  plRows: PLRow[]
): string | null {
  if (txMoms) return txMoms;
  const acct = plRows.find(r => (r.t === 'acct' || r.t === 'bal') && r.nr === konto);
  if (acct?.moms) return acct.moms;
  if (acct?.lbl) {
    const lbl = acct.lbl.toLowerCase();
    if (lbl.includes('u/moms') || lbl.includes('u.moms') || lbl.includes('uden moms')) {
      return null;
    }
    if (lbl.includes('m/moms') || lbl.includes('m. moms')) {
      // Revenue accounts use U25 (salgsmoms), all other accounts use I25 (købsmoms).
      // Revenue is identified positionally from the PL structure, not by account number range.
      return getRevenueAccounts(plRows).has(konto) ? 'U25' : 'I25';
    }
  }
  return null;
}

export function computeRealized(
  txns: { dato: string; konto: number; belob: number; moms: string | null }[],
  year: number = YEAR,
  plRows: PLRow[] = PL
): Record<string, number> {
  const r: Record<string, number> = {};
  txns.forEach(tx => {
    if (!tx.dato) return;
    const d = new Date(tx.dato);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    const m = d.getMonth() + 1;
    const effectiveMoms = resolveEffectiveMoms(tx.moms, tx.konto, plRows);
    const net = netBelob(tx.belob, effectiveMoms);
    const key = `${tx.konto}-${m}`;
    r[key] = (r[key] || 0) - net;
  });
  return r;
}

export function computePL(realized: Record<string, number>, budget: Record<number, number[]>, plRows: PLRow[] = PL): Record<string | number, PLValues> {
  const vals: Record<string | number, PLValues> = {};
  plRows.filter(x => x.t === 'acct' || x.t === 'bal').forEach(x => {
    vals[x.nr!] = {
      r: Array.from({ length: 12 }, (_, i) => realized[`${x.nr}-${i + 1}`] || 0),
      b: Array.from({ length: 12 }, (_, i) => (budget[x.nr!] ? budget[x.nr!][i] : 0) || 0),
    };
  });
  plRows.filter(x => ['total', 'res', 'final'].includes(x.t)).forEach(x => {
    const r = new Array(12).fill(0);
    const b = new Array(12).fill(0);
    x.sum!.split('+').forEach(p => {
      p = p.trim();
      if (p.startsWith('range:')) {
        const [start, end] = p.slice(6).split('-').map(Number);
        plRows.filter(a => a.t === 'acct' && a.nr! >= start && a.nr! <= end).forEach(a => {
          vals[a.nr!]?.r.forEach((v, i) => r[i] += v);
          vals[a.nr!]?.b.forEach((v, i) => b[i] += v);
        });
      } else if (p.startsWith('grp:')) {
        const g = p.slice(4);
        plRows.filter(a => a.t === 'acct' && a.grp === g).forEach(a => {
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

export function computeDynamicBudget(realized: Record<string, number>, nReal: number, plRows: PLRow[] = PL): Record<number, number[]> {
  const dynBudget: Record<number, number[]> = {};
  plRows.filter(x => x.t === 'acct' || x.t === 'bal').forEach(x => {
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

/**
 * Shared helper: compute netto, moms, and brutto for a transaction.
 * For imported txns (belob is brutto when moms applies): returns netto = belob/1.25
 * For manual pipeline jobs (belob is already netto): use getJobAmounts instead
 */
export function getTxnAmounts(
  belob: number,
  txMoms: string | null | undefined,
  konto: number,
  plRows: PLRow[]
): { netto: number; momsBeloeb: number; brutto: number; momsCode: string | null } {
  const momsCode = resolveEffectiveMoms(txMoms, konto, plRows);
  const hasMoms = momsCode === 'U25' || momsCode === 'I25';
  const absBelob = Math.abs(belob);
  const netto = hasMoms ? absBelob / 1.25 : absBelob;
  const momsBeloeb = hasMoms ? absBelob - netto : 0;
  return { netto, momsBeloeb, brutto: absBelob, momsCode };
}

/**
 * For manual pipeline jobs where amount is already ekskl. moms
 */
export function getJobAmounts(
  amount: number,
  konto: number,
  plRows: PLRow[]
): { netto: number; momsBeloeb: number; brutto: number; momsCode: string | null } {
  const momsCode = resolveEffectiveMoms(null, konto, plRows);
  const hasMoms = momsCode === 'U25' || momsCode === 'I25';
  const netto = Math.abs(amount);
  const momsBeloeb = hasMoms ? netto * 0.25 : 0;
  const brutto = netto + momsBeloeb;
  return { netto, momsBeloeb, brutto, momsCode };
}

export function fmtDec(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '–';
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function sumArr(arr: number[], from = 0, to = 11): number {
  return arr.slice(from, to + 1).reduce((a, b) => a + b, 0);
}

/**
 * Tokenize a string into lowercase words for comparison.
 */
function tokenize(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^a-zæøå0-9]/gi, ' ').split(/\s+/).filter(t => t.length > 1);
}

/**
 * Compute token overlap ratio (0–1) between two strings.
 */
export function tokenOverlap(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  const matches = ta.filter(t => tb.has(t)).length;
  return matches / Math.max(ta.length, tb.size);
}

/**
 * Compute a match score between a future expense and a transaction.
 * Returns 0 if konto doesn't match (hard requirement).
 */
export function computeMatchScore(
  expense: { konto: number; belob: number; dato: string; tekst: string },
  txn: { konto: number; belob: number; dato: string; tekst: string }
): number {
  // Hard requirement: same account
  if (expense.konto !== txn.konto) return 0;

  let score = 0;

  // Amount scoring (compare absolute values)
  const expAbs = Math.abs(expense.belob);
  const txnAbs = Math.abs(txn.belob);
  const maxAbs = Math.max(expAbs, txnAbs, 1);
  const pctDiff = Math.abs(expAbs - txnAbs) / maxAbs;
  if (pctDiff <= 0.005 || Math.abs(expAbs - txnAbs) <= 1) score += 50;
  else if (pctDiff <= 0.05) score += 30;
  else if (pctDiff <= 0.15) score += 10;

  // Date proximity scoring
  if (expense.dato && txn.dato) {
    const expDate = new Date(expense.dato);
    const txnDate = new Date(txn.dato);
    const diffDays = Math.abs(expDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0.5) score += 30;
    else if (diffDays <= 7) score += 20;
    else if (diffDays <= 30) score += 10;
    else score += 5;
  }

  // Text similarity bonus (up to 20 points)
  const overlap = tokenOverlap(expense.tekst, txn.tekst);
  score += Math.round(overlap * 20);

  return score;
}
