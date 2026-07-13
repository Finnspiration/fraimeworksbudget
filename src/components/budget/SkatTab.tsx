import { YEAR, MONTHS, type LiquidityConfig } from '@/data/budget-constants';
import { fmt, sumArr, resolveEffectiveMoms, computeBudgetMomsPerMonth, computeRealMomsPerMonth, type PLValues } from '@/lib/budget-utils';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown } from 'lucide-react';
import type { Transaction, BskatRate, PLRow } from '@/data/budget-constants';

interface Props {
  pl: Record<string | number, PLValues>;
  txns: Transaction[];
  nReal: number;
  activePL: PLRow[];
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
  budgetMode: 'fixed' | 'dynamic';
  setBudgetMode: (v: 'fixed' | 'dynamic') => void;
  liquidityConfig: LiquidityConfig;
  setLiquidityConfig: (v: LiquidityConfig) => void;
}

const quarters = [
  { id: 1, label: 'Q1 Jan-Mar', months: [0, 1, 2], forfald: '01-07-2026' },
  { id: 2, label: 'Q2 Apr-Jun', months: [3, 4, 5], forfald: '01-10-2026' },
  { id: 3, label: 'Q3 Jul-Sep', months: [6, 7, 8], forfald: '01-01-2027' },
  { id: 4, label: 'Q4 Okt-Dec', months: [9, 10, 11], forfald: '01-04-2027' },
];

export default function SkatTab({ pl, txns, nReal, activePL, momsBetalt, setMomsBetalt, bskat, setBskat, andenGeld, setAndenGeld, skatPct, setSkatPct, virksomhedstype, setVirksomhedstype, budgetMode, setBudgetMode, liquidityConfig, setLiquidityConfig }: Props) {
  const isDynamic = budgetMode === 'dynamic';
  const updateBskat = (i: number, field: keyof BskatRate, val: string | number) =>
    setBskat(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r));

  // Budget-moms + realiseret moms via shared helpers (samme kilde som ResultatTab)
  const { salgs: budgetSalgsMomsPerMonth, kob: budgetKobsMomsPerMonth } = useMemo(
    () => computeBudgetMomsPerMonth(pl, activePL), [pl, activePL]
  );
  const { salgs: realSalgsMomsPerMonth, kob: realKobsMomsPerMonth } = useMemo(
    () => computeRealMomsPerMonth(txns, activePL), [txns, activePL]
  );

  // Kombineret moms: realiseret for i < nReal, budget for i >= nReal
  const combinedSalgsMoms = (months: number[]) =>
    months.reduce((s, m) => s + (m < nReal ? realSalgsMomsPerMonth[m] : budgetSalgsMomsPerMonth[m]), 0);
  const combinedKobsMoms = (months: number[]) =>
    months.reduce((s, m) => s + (m < nReal ? realKobsMomsPerMonth[m] : budgetKobsMomsPerMonth[m]), 0);

  const omsRow = pl['oms'] as PLValues | undefined;

  const totalBskatSkyldigt = bskat.reduce((s, r) => s + Number(r.belob || 0), 0);
  const totalBskatBetalt = bskat.reduce((s, r) => s + Number(r.betalt || 0), 0);
  const resRow = pl['res'] as PLValues | undefined;
  const projRes = resRow ? MONTHS.reduce((s, _, i) => s + (i < nReal ? resRow.r[i] : resRow.b[i]), 0) : 0;
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

      {/* Budget toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{isDynamic ? 'Dynamisk' : 'Fast'} budget</span>
          <Switch checked={isDynamic} onCheckedChange={c => setBudgetMode(c ? 'dynamic' : 'fixed')} />
        </div>
        {isDynamic && <Badge variant="secondary" className="text-xs">Rolling forecast</Badge>}
      </div>

      <Card>
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
                  const salgsmoms = combinedSalgsMoms(q.months);
                  const kobsmoms = combinedKobsMoms(q.months);
                  const hasEstimate = q.months.some(m => m >= nReal);
                  const netto = salgsmoms - kobsmoms;
                  const betalt = Number(momsBetalt[qi] || 0);
                  const udest = netto - betalt;
                  return (
                    <tr key={q.id} className={`border-b border-border/30 ${hasEstimate ? 'italic' : ''}`}>
                      <td className="px-3 py-2 font-medium">{q.label} {hasEstimate && <span className="text-xs text-muted-foreground not-italic">(est.)</span>}</td>
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
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + combinedSalgsMoms(q.months), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + combinedKobsMoms(q.months), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q) => s + combinedSalgsMoms(q.months) - combinedKobsMoms(q.months), 0))}</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(quarters.reduce((s, q, i) => s + combinedSalgsMoms(q.months) - combinedKobsMoms(q.months) - Number(momsBetalt[i] || 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!txns.some(tx => resolveEffectiveMoms(tx.moms, tx.konto, activePL) === 'U25') && nReal > 0 && <p className="text-xs text-primary mt-3">⚠ Salgsmoms vises som 0 for realiserede måneder — tilføj momskode U25 på salgsfakturaer i kassekladden.</p>}
        </CardContent>
      </Card>

      {/* Estimeret moms pr. måned */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">📅 Estimeret moms pr. måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2">Måned</th>
                  <th className="text-right px-3 py-2">Salgsmoms</th>
                  <th className="text-right px-3 py-2">Købsmoms</th>
                  <th className="text-right px-3 py-2">Netto moms</th>
                  <th className="text-right px-3 py-2">Akkumuleret</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let accMoms = 0;
                  return MONTHS.map((m, i) => {
                    const isReal = i < nReal;
                    const salg = isReal ? realSalgsMomsPerMonth[i] : budgetSalgsMomsPerMonth[i];
                    const kob = isReal ? realKobsMomsPerMonth[i] : budgetKobsMomsPerMonth[i];
                    const netto = salg - kob;
                    accMoms += netto;
                    return (
                      <tr key={m} className={`border-b border-border/30 ${!isReal ? 'text-muted-foreground italic' : ''}`}>
                        <td className={`px-3 py-2 ${isReal ? 'font-medium' : ''}`}>{m}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(salg)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(kob)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(netto)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(accMoms)}</td>
                      </tr>
                    );
                  });
                })()}
                <tr className="font-semibold bg-secondary/50">
                  <td className="px-3 py-2">Årsestimat</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(MONTHS.reduce((s, _, i) => s + (i < nReal ? realSalgsMomsPerMonth[i] : budgetSalgsMomsPerMonth[i]), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(MONTHS.reduce((s, _, i) => s + (i < nReal ? realKobsMomsPerMonth[i] : budgetKobsMomsPerMonth[i]), 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(MONTHS.reduce((s, _, i) => {
                    const salg = i < nReal ? realSalgsMomsPerMonth[i] : budgetSalgsMomsPerMonth[i];
                    const kob = i < nReal ? realKobsMomsPerMonth[i] : budgetKobsMomsPerMonth[i];
                    return s + salg - kob;
                  }, 0))}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          {nReal === 0 && <p className="text-xs text-muted-foreground mt-2">Ingen realiserede data endnu — alle måneder er estimater.</p>}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">📅 Estimeret skat pr. måned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2">Måned</th>
                  <th className="text-right px-3 py-2">Resultat</th>
                  <th className="text-right px-3 py-2">Estimeret skat</th>
                  <th className="text-right px-3 py-2">Akkumuleret</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let accRes = 0;
                  let accTax = 0;
                  return MONTHS.map((m, i) => {
                    const isReal = i < nReal;
                    const monthRes = isReal && resRow ? resRow.r[i] : (resRow ? resRow.b[i] : 0);
                    accRes += monthRes;
                    const monthTax = Math.max(0, accRes * (skatPct / 100)) - accTax;
                    accTax += monthTax;
                    return (
                      <tr key={m} className={`border-b border-border/30 ${!isReal ? 'text-muted-foreground italic' : ''}`}>
                        <td className={`px-3 py-2 ${isReal ? 'font-medium' : ''}`}>{m}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(monthRes)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(monthTax)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(accTax)}</td>
                      </tr>
                    );
                  });
                })()}
                <tr className="font-semibold bg-secondary/50">
                  <td className="px-3 py-2">Årsestimat</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(resRow ? MONTHS.reduce((s, _, i) => s + (i < nReal ? resRow.r[i] : resRow.b[i]), 0) : 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(estimSkat)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          {nReal === 0 && <p className="text-xs text-muted-foreground mt-2">Ingen realiserede data endnu — alle måneder er estimater.</p>}
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
              const netto = combinedSalgsMoms(q.months) - combinedKobsMoms(q.months);
              const udest = netto - Number(momsBetalt[i] || 0);
              return (
                <p key={q.id} className="flex justify-between text-sm">
                  <span>Moms {q.label}:</span>
                  <span className={`font-medium tabular-nums ${udest > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{udest !== 0 ? fmt(udest) : '✓'}</span>
                </p>
              );
            })}
            <p className="flex justify-between text-sm">
              <span>{skatLabel} udestående:</span>
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
                    quarters.reduce((s, q, i) => s + Math.max(0, combinedSalgsMoms(q.months) - combinedKobsMoms(q.months) - Number(momsBetalt[i] || 0)), 0) +
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
