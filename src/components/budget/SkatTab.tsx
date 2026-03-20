import { YEAR } from '@/data/budget-constants';
import { fmt, sumArr, type PLValues } from '@/lib/budget-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Transaction, BskatRate } from '@/data/budget-constants';

interface Props {
  pl: Record<string | number, PLValues>;
  txns: Transaction[];
  nReal: number;
  momsBetalt: number[];
  setMomsBetalt: React.Dispatch<React.SetStateAction<number[]>>;
  bskat: BskatRate[];
  setBskat: React.Dispatch<React.SetStateAction<BskatRate[]>>;
  andenGeld: number;
  setAndenGeld: (v: number) => void;
  skatPct: number;
  setSkatPct: (v: number) => void;
  virksomhedstype: 'personlig' | 'selskab';
  setVirksomhedstype: (v: 'personlig' | 'selskab') => void;
}

const quarters = [
  { id: 1, label: 'Q1 Jan-Mar', months: [0, 1, 2], forfald: '01-07-2026' },
  { id: 2, label: 'Q2 Apr-Jun', months: [3, 4, 5], forfald: '01-10-2026' },
  { id: 3, label: 'Q3 Jul-Sep', months: [6, 7, 8], forfald: '01-01-2027' },
  { id: 4, label: 'Q4 Okt-Dec', months: [9, 10, 11], forfald: '01-04-2027' },
];

export default function SkatTab({ pl, txns, nReal, momsBetalt, setMomsBetalt, bskat, setBskat, andenGeld, setAndenGeld, skatPct, setSkatPct, virksomhedstype, setVirksomhedstype }: Props) {
  const updateBskat = (i: number, field: keyof BskatRate, val: string | number) =>
    setBskat(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r));

  const computeKobsmoms = (months: number[]) =>
    txns.filter(tx => {
      if (!tx.dato) return false;
      const d = new Date(tx.dato);
      return d.getFullYear() === YEAR && months.includes(d.getMonth()) && tx.moms === 'I25';
    }).reduce((s, tx) => s + tx.belob / 5, 0);

  const computeSalgsmoms = (months: number[]) =>
    txns.filter(tx => {
      if (!tx.dato) return false;
      const d = new Date(tx.dato);
      return d.getFullYear() === YEAR && months.includes(d.getMonth()) && tx.moms === 'U25';
    }).reduce((s, tx) => s + Math.abs(tx.belob) / 5, 0);

  const omsRow = pl['oms'] as PLValues | undefined;

  const totalBskatSkyldigt = bskat.reduce((s, r) => s + Number(r.belob || 0), 0);
  const totalBskatBetalt = bskat.reduce((s, r) => s + Number(r.betalt || 0), 0);
  const resRow = pl['res'] as PLValues | undefined;
  const projRes = resRow && nReal > 0 ? sumArr(resRow.r, 0, nReal - 1) * 12 / nReal : 0;
  const estimSkat = Math.max(0, projRes * (skatPct / 100));
  const restskat = estimSkat - totalBskatBetalt;

  const skatLabel = virksomhedstype === 'selskab' ? 'Aconto skat' : 'B-skat';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">🏢 Virksomhedstype</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup type="single" value={virksomhedstype} onValueChange={(v) => v && setVirksomhedstype(v as 'personlig' | 'selskab')}>
            <ToggleGroupItem value="personlig" className="text-xs">Personlig virksomhed</ToggleGroupItem>
            <ToggleGroupItem value="selskab" className="text-xs">Selskab (ApS/AS)</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">📋 Momsafregning {YEAR}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2">Kvartal</th>
                  <th className="text-right px-3 py-2">Salgsmoms</th>
                  <th className="text-right px-3 py-2">Købsmoms</th>
                  <th className="text-right px-3 py-2">Netto skyldig</th>
                  <th className="text-center px-3 py-2">Forfald</th>
                  <th className="text-right px-3 py-2">Betalt (kr)</th>
                  <th className="text-right px-3 py-2">Udestående</th>
                </tr>
              </thead>
              <tbody>
                {quarters.map((q, qi) => {
                  const salgsmoms = computeSalgsmoms(q.months);
                  const kobsmoms = computeKobsmoms(q.months);
                  const netto = salgsmoms - kobsmoms;
                  const betalt = Number(momsBetalt[qi] || 0);
                  const udest = netto - betalt;
                  return (
                    <tr key={q.id} className="border-b border-border/30">
                      <td className="px-3 py-2 font-medium">{q.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(salgsmoms)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(kobsmoms)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(netto)}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{q.forfald}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={momsBetalt[qi] || ''} onChange={e => setMomsBetalt(prev => { const n = [...prev]; n[qi] = Number(e.target.value); return n; })}
                          className="w-28 text-right border border-border rounded px-2 py-0.5 text-primary bg-secondary text-sm tabular-nums" placeholder="0" />
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${udest > 0 ? 'text-destructive' : udest < 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-muted-foreground'}`}>
                        {udest !== 0 ? fmt(udest) : '✓'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold bg-secondary/50">
                  <td className="px-3 py-2">Moms i alt</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + computeSalgsmoms(q.months), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + computeKobsmoms(q.months), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + computeSalgsmoms(q.months) - computeKobsmoms(q.months), 0))}</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q, i) => s + computeSalgsmoms(q.months) - computeKobsmoms(q.months) - Number(momsBetalt[i] || 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!txns.some(tx => tx.moms === 'U25') && <p className="text-xs text-primary mt-3">⚠ Salgsmoms vises som 0 — tilføj momskode U25 på salgsfakturaer i kassekladden.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">💳 {skatLabel} {YEAR}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2">Rate</th>
                  <th className="text-right px-3 py-2">Beløb (kr)</th>
                  <th className="text-center px-3 py-2">Forfald</th>
                  <th className="text-right px-3 py-2">Betalt (kr)</th>
                  <th className="text-center px-3 py-2">Dato</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bskat.map((r, i) => {
                  const paid = Number(r.betalt || 0) >= Number(r.belob || 0) && Number(r.belob || 0) > 0;
                  return (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="px-3 py-2 font-medium">Rate {r.id}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={r.belob || ''} onChange={e => updateBskat(i, 'belob', e.target.value)}
                          className="w-28 text-right border border-border rounded px-2 py-0.5 text-primary bg-secondary tabular-nums" placeholder="0" />
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground text-xs">{r.forfald}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={r.betalt || ''} onChange={e => updateBskat(i, 'betalt', e.target.value)}
                          className="w-28 text-right border border-border rounded px-2 py-0.5 text-primary bg-secondary tabular-nums" placeholder="0" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="date" value={r.betaltDato} onChange={e => updateBskat(i, 'betaltDato', e.target.value)}
                          className="border border-border rounded px-2 py-0.5 text-xs text-muted-foreground bg-card" />
                      </td>
                      <td className={`px-3 py-2 text-center text-xs font-medium ${paid ? 'text-[hsl(var(--budget-positive))]' : 'text-muted-foreground'}`}>
                        {paid ? '✓ Betalt' : Number(r.belob) > 0 ? '⏳ Afventer' : '–'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold bg-secondary/50">
                  <td className="px-3 py-2">I alt</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(totalBskatSkyldigt)}</td>
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(totalBskatBetalt)}</td>
                  <td />
                  <td className={`px-3 py-2 text-center text-xs ${totalBskatSkyldigt - totalBskatBetalt > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>
                    {fmt(totalBskatSkyldigt - totalBskatBetalt)} udestående
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">📊 Beregnet årets skat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Skattesats (%):</span>
              <input type="number" value={skatPct} onChange={e => setSkatPct(Number(e.target.value))}
                className="w-20 text-right border border-border rounded px-2 py-1 text-primary bg-secondary font-bold tabular-nums" />
            </div>
            <p className="text-sm">Projekteret årsresultat: <span className="font-semibold tabular-nums">{fmt(projRes)} kr</span></p>
            <p className="text-sm">Estimeret skat: <span className="font-semibold tabular-nums">{fmt(estimSkat)} kr</span></p>
            <p className="text-sm">Betalt aconto: <span className="font-semibold tabular-nums">{fmt(totalBskatBetalt)} kr</span></p>
            <p className={`text-sm font-bold ${restskat > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>
              {restskat > 0 ? 'Restskat' : 'Overskydende skat'}: {fmt(Math.abs(restskat))} kr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🏦 Samlet skyldig oversigt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quarters.map((q, i) => {
              const netto = computeSalgsmoms(q.months) - computeKobsmoms(q.months);
              const udest = netto - Number(momsBetalt[i] || 0);
              return (
                <p key={q.id} className="flex justify-between text-sm">
                  <span>Moms {q.label}:</span>
                  <span className={`font-medium tabular-nums ${udest > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{udest !== 0 ? fmt(udest) : '✓'}</span>
                </p>
              );
            })}
            <p className="flex justify-between text-sm">
              <span>B-skat udestående:</span>
              <span className="font-medium tabular-nums">{fmt(totalBskatSkyldigt - totalBskatBetalt)}</span>
            </p>
            <p className="flex justify-between text-sm items-center">
              <span>Anden gæld:</span>
              <input type="number" value={andenGeld || ''} onChange={e => setAndenGeld(Number(e.target.value))}
                className="w-28 text-right border border-border rounded px-2 py-0.5 text-primary bg-secondary text-xs tabular-nums" placeholder="0" />
            </p>
            <div className="border-t pt-2 mt-2">
              <p className="flex justify-between text-sm font-bold">
                <span>Samlet udestående:</span>
                <span className="tabular-nums">
                  {fmt(
                    quarters.reduce((s, q, i) => s + Math.max(0, computeSalgsmoms(q.months) - computeKobsmoms(q.months) - Number(momsBetalt[i] || 0)), 0) +
                    Math.max(0, totalBskatSkyldigt - totalBskatBetalt) + Number(andenGeld || 0)
                  )} kr
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
