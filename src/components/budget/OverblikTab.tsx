import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { MONTHS, YEAR, type PLRow, type BskatRate } from '@/data/budget-constants';
import { fmt, sumArr, type PLValues } from '@/lib/budget-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Crosshair, Users, AlertTriangle } from 'lucide-react';
import type { PipelineJobWithCustomer } from '@/hooks/use-pipeline';
import type { Transaction } from '@/data/budget-constants';

interface Props {
  pl: Record<string | number, PLValues>;
  nReal: number;
  txns: Transaction[];
  activePL: PLRow[];
  pipelineJobs?: PipelineJobWithCustomer[];
  budgetMode: 'fixed' | 'dynamic';
  setBudgetMode: (v: 'fixed' | 'dynamic') => void;
  momsBetalt: number[];
  bskat: BskatRate[];
  andenGeld: number;
  skatPct: number;
  virksomhedstype: 'personlig' | 'selskab';
}

function KpiCard({ label, value, sub, positive, icon }: { label: string; value: string; sub?: string; positive?: boolean; icon: React.ReactNode }) {
  return (
    <Card className={`border-l-4 ${positive === undefined ? 'border-l-primary' : positive ? 'border-l-[hsl(var(--budget-positive))]' : 'border-l-destructive'}`}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">{icon}{label}</div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function OverblikTab({ pl, nReal, txns, activePL, pipelineJobs = [], budgetMode, setBudgetMode, momsBetalt, bskat, andenGeld, skatPct, virksomhedstype }: Props) {
  const resRow = pl['res'] as PLValues | undefined;

  const firstTotal = activePL.find(r => r.t === 'total');
  const omsId = firstTotal?.id;
  const omsRow = omsId ? (pl[omsId] as PLValues | undefined) : undefined;

  const omsGroups = useMemo(() => {
    if (!firstTotal?.sum) return [] as string[];
    return firstTotal.sum.split('+').map(s => s.trim()).filter(s => s.startsWith('grp:')).map(s => s.slice(4));
  }, [firstTotal]);

  const ytdReal = resRow ? sumArr(resRow.r, 0, nReal - 1) : 0;
  const ytdBud = resRow ? sumArr(resRow.b, 0, nReal - 1) : 0;
  const ytdOms = omsRow ? sumArr(omsRow.r, 0, nReal - 1) : 0;
  const ytdOmsBud = omsRow ? sumArr(omsRow.b, 0, nReal - 1) : 0;
  const projYear = nReal > 0 && resRow ? (sumArr(resRow.r, 0, nReal - 1) / nReal) * 12 : 0;
  const yearBud = resRow ? sumArr(resRow.b) : 0;

  const expenseAcctRows = useMemo(() =>
    activePL.filter(r => r.t === 'acct' && !omsGroups.includes(r.grp!))
  , [activePL, omsGroups]);

  const expensesByMonth = useMemo(() => {
    return MONTHS.map((_, i) => {
      let total = 0;
      for (const row of expenseAcctRows) {
        const vals = pl[row.nr!] as PLValues | undefined;
        if (vals) total += Math.abs(vals.r[i]);
      }
      return total;
    });
  }, [pl, expenseAcctRows]);

  const expenseBudgetByMonth = useMemo(() => {
    return MONTHS.map((_, i) => {
      let total = 0;
      for (const row of expenseAcctRows) {
        const vals = pl[row.nr!] as PLValues | undefined;
        if (vals) total += Math.abs(vals.b[i]);
      }
      return total;
    });
  }, [pl, expenseAcctRows]);

  const chartData = useMemo(() => MONTHS.map((m, i) => ({
    name: m,
    'Budget oms.': omsRow ? Math.max(0, omsRow.b[i]) : 0,
    Omsætning: omsRow ? Math.max(0, omsRow.r[i]) : 0,
    'Budget udg.': expenseBudgetByMonth[i],
    Udgifter: expensesByMonth[i],
  })), [omsRow, nReal, expensesByMonth, expenseBudgetByMonth]);

  const runData = useMemo(() => {
    let cumReal = 0, cumBud = 0;
    return MONTHS.map((m, i) => {
      if (i < nReal && resRow) cumReal += resRow.r[i];
      if (resRow) cumBud += resRow.b[i];
      return { name: m, 'Akkum. realiseret': i < nReal ? Math.round(cumReal) : null, 'Akkum. budget': Math.round(cumBud) };
    });
  }, [resRow, nReal]);

  const expenseAccts = useMemo(() =>
    expenseAcctRows.map(x => ({
      label: x.lbl!, nr: x.nr!,
      ytd: pl[x.nr!] ? Math.abs(sumArr(pl[x.nr!].r, 0, nReal - 1)) : 0,
    })).filter(x => x.ytd > 0).sort((a, b) => b.ytd - a.ytd).slice(0, 6)
  , [pl, nReal, expenseAcctRows]);

  const maxExp = expenseAccts[0]?.ytd || 1;

  const weightedPipeline = pipelineJobs
    .filter(j => j.status !== 'tabt')
    .reduce((s, j) => s + Number(j.amount) * j.probability / 100, 0);

  // ─── Top customers (pipeline-based) ───
  const topCustomers = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of pipelineJobs) {
      if (j.status === 'tabt') continue;
      const name = j.customers?.name || 'Ukendt';
      const val = Number(j.amount) * j.probability / 100;
      map[name] = (map[name] || 0) + val;
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [pipelineJobs]);

  const maxCustomer = topCustomers[0]?.amount || 1;

  // ─── Debt overview ───
  const debtData = useMemo(() => {
    // Moms: salgsmoms - købsmoms - betalt
    let totalMomsOwed = 0;
    const qDefs = [
      { months: [0, 1, 2] },
      { months: [3, 4, 5] },
      { months: [6, 7, 8] },
      { months: [9, 10, 11] },
    ];
    qDefs.forEach((q, qi) => {
      const salgsmoms = txns
        .filter(tx => tx.dato && new Date(tx.dato).getFullYear() === YEAR && q.months.includes(new Date(tx.dato).getMonth()) && tx.moms === 'U25')
        .reduce((s, tx) => s + Math.abs(tx.belob) / 5, 0);
      const kobsmoms = txns
        .filter(tx => tx.dato && new Date(tx.dato).getFullYear() === YEAR && q.months.includes(new Date(tx.dato).getMonth()) && tx.moms === 'I25')
        .reduce((s, tx) => s + tx.belob / 5, 0);
      const netto = salgsmoms + kobsmoms; // kobsmoms is negative
      const betalt = momsBetalt[qi] || 0;
      totalMomsOwed += netto - betalt;
    });

    // Skat
    const totalBskatBetalt = bskat.reduce((s, r) => s + r.betalt, 0);
    const estimatedTax = projYear * skatPct / 100;
    const skatOwed = estimatedTax - totalBskatBetalt;

    return {
      moms: Math.round(totalMomsOwed),
      skat: Math.round(skatOwed),
      andenGeld: Math.round(andenGeld),
      total: Math.round(totalMomsOwed + skatOwed + andenGeld),
    };
  }, [txns, momsBetalt, bskat, projYear, skatPct, andenGeld]);

  return (
    <div className="space-y-6">
      {/* Budget toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Budget:</span>
        <ToggleGroup type="single" value={budgetMode} onValueChange={v => v && setBudgetMode(v as 'fixed' | 'dynamic')}>
          <ToggleGroupItem value="fixed" className="text-xs px-3 h-7">Fast budget</ToggleGroupItem>
          <ToggleGroupItem value="dynamic" className="text-xs px-3 h-7">Dynamisk budget</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={<DollarSign className="h-3.5 w-3.5" />} label="YTD Resultat" value={`${fmt(ytdReal)} kr`} sub={`Budget: ${fmt(ytdBud)} kr`} positive={ytdReal >= ytdBud} />
        <KpiCard icon={<BarChart3 className="h-3.5 w-3.5" />} label="YTD Omsætning" value={`${fmt(ytdOms)} kr`} sub={`Budget: ${fmt(ytdOmsBud)} kr`} positive={ytdOms >= ytdOmsBud} />
        <KpiCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Proj. årsresultat" value={`${fmt(projYear)} kr`} sub={`Årsbudget: ${fmt(yearBud)} kr`} positive={projYear >= yearBud} />
        <KpiCard icon={<Crosshair className="h-3.5 w-3.5" />} label="Pipeline (vægtet)" value={`${fmt(weightedPipeline)} kr`} sub={`${pipelineJobs.filter(j => j.status !== 'tabt').length} aktive jobs`} />
        <KpiCard icon={ytdReal >= ytdBud ? <Target className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} label="Budget status" value={ytdReal >= ytdBud ? '✓ Foran budget' : '⚠ Bag budget'} positive={ytdReal >= ytdBud} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Månedlig omsætning vs. udgifter</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}t`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, n: string) => [`${fmt(v)} kr`, n]} />
                <Legend />
                <Bar dataKey="Omsætning" fill="hsl(var(--budget-positive))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Udgifter" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Akkumuleret resultat vs. budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={runData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}t`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number | null, n: string) => v != null ? [`${fmt(v)} kr`, n] : [null, n]} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Line type="monotone" dataKey="Akkum. budget" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="Akkum. realiseret" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Største udgiftsposter */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Største udgiftsposter YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseAccts.map(a => (
                <div key={a.nr} className="flex items-center gap-3 text-sm">
                  <span className="w-10 text-muted-foreground tabular-nums text-xs">{a.nr}</span>
                  <span className="w-32 truncate">{a.label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(a.ytd / maxExp) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right font-medium tabular-nums text-xs">{fmt(-a.ytd)} kr</span>
                </div>
              ))}
              {expenseAccts.length === 0 && <p className="text-sm text-muted-foreground">Ingen udgifter endnu</p>}
            </div>
          </CardContent>
        </Card>

        {/* Største kunder */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Største kunder (pipeline)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.map(c => (
                <div key={c.name} className="flex items-center gap-3 text-sm">
                  <span className="w-32 truncate">{c.name}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(var(--budget-positive))] rounded-full transition-all" style={{ width: `${(c.amount / maxCustomer) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right font-medium tabular-nums text-xs">{fmt(c.amount)} kr</span>
                </div>
              ))}
              {topCustomers.length === 0 && <p className="text-sm text-muted-foreground">Ingen pipeline-kunder endnu</p>}
            </div>
          </CardContent>
        </Card>

        {/* Skyldige poster */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Skyldige poster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skyldig moms</span>
                <span className={`font-medium tabular-nums ${debtData.moms > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{fmt(debtData.moms)} kr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skyldig skat ({virksomhedstype === 'selskab' ? 'selskab' : 'B-skat'})</span>
                <span className={`font-medium tabular-nums ${debtData.skat > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{fmt(debtData.skat)} kr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anden gæld</span>
                <span className={`font-medium tabular-nums ${debtData.andenGeld > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{fmt(debtData.andenGeld)} kr</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>I alt</span>
                <span className={`tabular-nums ${debtData.total > 0 ? 'text-destructive' : 'text-[hsl(var(--budget-positive))]'}`}>{fmt(debtData.total)} kr</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!ytdOms && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          💡 Omsætning (konto 1xxx) er ikke i kassekladden endnu — fakturadata bogføres typisk separat. Importér den fulde kassekladde inkl. salgsbilag for korrekte tal.
        </div>
      )}
    </div>
  );
}
