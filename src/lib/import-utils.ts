import { resolveEffectiveMoms } from '@/lib/budget-utils';
import type { PLRow, Transaction } from '@/data/budget-constants';

export const parseDanishNumber = (val: unknown): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return 0;
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
};

export const parseDanishDate = (val: unknown): string => {
  if (val == null) return '';
  if (typeof val === 'object' && 'toISOString' in (val as object)) return (val as Date).toISOString().slice(0, 10);
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return s;
};

export interface ParseTransactionsResult {
  parsed: Transaction[];
  error?: string;
}

export function parseTransactionsFromSheet(
  rows: (string | number | null)[][],
  activePL: PLRow[]
): ParseTransactionsResult {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i].map(c => String(c || '').toLowerCase());
    if (r.some(c => c.includes('konto')) && (r.some(c => c.includes('beløb') || c.includes('belob')) || r.some(c => c.includes('type')))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { parsed: [], error: 'Kunne ikke finde header-række (skal indeholde Konto og Beløb/Type)' };
  }
  const headers = rows[headerIdx].map(h => String(h || '').toLowerCase().trim());
  const col = (name: string) => headers.findIndex(h => h.includes(name));
  const cDato = col('dato'), cBelob = col('beløb') !== -1 ? col('beløb') : col('belob');
  const cKonto = headers.findIndex(h => h === 'konto' || (h.includes('konto') && !h.includes('mod')));
  const cMoms = col('moms'), cBilag = col('bilag'), cTekst = col('tekst');
  const cType = col('type');
  const cFaktura = headers.findIndex(h => h.includes('faktura') || h.includes('fak'));
  const cModkonto = headers.findIndex(h => h.includes('modkonto') || h.includes('mod.konto') || h === 'modkto');

  const parsed: Transaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[cKonto]) continue;
    const belob = cBelob >= 0 ? parseDanishNumber(r[cBelob]) : 0;
    if (belob === 0) continue;
    const dato = cDato >= 0 ? parseDanishDate(r[cDato]) : '';
    const konto = Number(r[cKonto]);
    const modkonto = cModkonto >= 0 && r[cModkonto] ? Number(r[cModkonto]) : undefined;
    const faktura = cFaktura >= 0 && r[cFaktura] ? String(r[cFaktura]) : undefined;
    // Auto-resolve moms from chart of accounts if not in file
    let momsFromFile = cMoms >= 0 && r[cMoms] ? String(r[cMoms]) : null;
    if (!momsFromFile) {
      momsFromFile = resolveEffectiveMoms(null, konto, activePL);
    }
    parsed.push({
      id: 0, dato,
      type: cType >= 0 && r[cType] ? String(r[cType]) : 'Import',
      bilag: cBilag >= 0 ? String(r[cBilag] || '') : '',
      tekst: cTekst >= 0 ? String(r[cTekst] || '') : '',
      belob, konto,
      moms: momsFromFile,
      modkonto, faktura,
    });
  }
  return { parsed };
}
