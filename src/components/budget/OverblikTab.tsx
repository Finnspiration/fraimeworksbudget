import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { MONTHS, type PLRow, PL } from '@/data/budget-constants';
import { fmt, sumArr, type PLValues } from '@/lib/budget-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from 'lucide-react';

interface Props {
  pl: Record<string | number, PLValues>;
  nReal: number;
  txns: { konto: number }[];
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

export default function OverblikTab({ pl, nReal }: Props) {
  const resRow = pl['res'] as PLValues | undefined;
  const omsRow = pl['oms'] as PLValues | undefined;

  const ytdReal = resRow ? sumArr(resRow.r, 0, nReal - 1) : 0;
  const ytdBud = resRow ? sumArr(resRow.b, 0, nReal - 1) : 0;
  const ytdOms = omsRow ? sumArr(omsRow.r, 0, nReal - 1) : 0;
  const projYear = nReal > 0 && resRow ? (sumArr(resRow.r, 0, nReal - 1) / nReal) * 12 : 0;
  const yearBud = resRow ? sumArr(resRow.b) : 0;

  const chartData = useMemo(() => MONTHS.map((m, i) => ({
    name: m,
    Omsætning: omsRow ? Math.max(0, omsRow.r[i]) : 0,
    Udgifter: Math.abs(Math.min(0, resRow ? resRow.r[i] - (omsRow ? omsRow.r[i] : 0) : 0)),
    'Budget resultat': resRow ? resRow.b[i] : 0,
    Realiseret: i < nReal ? (resRow ? resRow.r[i] : 0) : null,
  })), [omsRow, resRow, nReal]);

  const runData = useMemo(() => {
    let cumReal = 0, cumBud = 0;
    return MONTHS.map((m, i) => {
      if (i < nReal && resRow) cumReal += resRow.r[i];
      if (resRow) cumBud += resRow.b[i];
      return { name: m, 'Akkum. realiseret': i < nReal ? Math.round(cumReal) : null, 'Akkum. budget': Math.round(cumBud) };
    });
  }, [resRow, nReal]);

  const expenseAccts = useMemo(() =>
    PL.filter(x => x.t === 'acct' && x.nr! > 1999).map(x => ({
      label: x.lbl!, nr: x.nr!,
      ytd: pl[x.nr!] ? Math.abs(sumArr(pl[x.nr!].r, 0, nReal - 1)) : 0,
    })).filter(x => x.ytd > 0).sort((a, b) => b.ytd - a.ytd).slice(0, 6)
  , [pl, nReal]);

  const maxExp = expenseAccts[0]?.ytd || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-3.5 w-3.5" />} label="YTD Resultat" value={`${fmt(ytdReal)} kr`} sub={`Budget: ${fmt(ytdBud)} kr`} positive={ytdReal >= ytdBud} />
        <KpiCard icon={<BarChart3 className="h-3.5 w-3.5" />} label="YTD Omsætning" value={`${fmt(ytdOms)} kr`} />
        <KpiCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Proj. årsresultat" value={`${fmt(projYear)} kr`} sub={`Årsbudget: ${fmt(yearBud)} kr`} positive={projYear >= yearBud} />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Største udgiftsposter YTD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenseAccts.map(a => (
              <div key={a.nr} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-muted-foreground tabular-nums text-xs">{a.nr}</span>
                <span className="w-48 truncate">{a.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(a.ytd / maxExp) * 100}%` }} />
                </div>
                <span className="w-24 text-right font-medium tabular-nums">{fmt(-a.ytd)} kr</span>
              </div>
            ))}
            {expenseAccts.length === 0 && <p className="text-sm text-muted-foreground">Ingen udgifter endnu</p>}
          </div>
        </CardContent>
      </Card>

      {!ytdOms && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          💡 Omsætning (konto 1xxx) er ikke i kassekladden endnu — fakturadata bogføres typisk separat. Importér den fulde kassekladde inkl. salgsbilag for korrekte tal.
        </div>
      )}
    </div>
  );
}
