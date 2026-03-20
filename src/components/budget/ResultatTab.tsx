import { useState, useMemo } from 'react';
import { MONTHS, MONTHS_FULL, PL } from '@/data/budget-constants';
import { fmt, sumArr, type PLValues } from '@/lib/budget-utils';

interface Props {
  pl: Record<string | number, PLValues>;
  nReal: number;
  setNReal: (n: number) => void;
}

function Cell({ v, realized, dimmed }: { v: number; realized?: boolean; dimmed?: boolean }) {
  if (v === 0 || v == null || isNaN(v)) return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : 'text-muted-foreground'}`}>–</td>;
  const color = realized
    ? (v < 0 ? 'text-destructive' : 'text-primary')
    : (v < 0 ? 'text-muted-foreground' : 'text-[hsl(var(--budget-positive))]');
  return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${color}`}>{fmt(v)}</td>;
}

export default function ResultatTab({ pl, nReal, setNReal }: Props) {
  const [showZero, setShowZero] = useState(false);
  const [collapsedSecs, setCollapsedSecs] = useState<Record<string, boolean>>({});
  const toggleSec = (lbl: string) => setCollapsedSecs(p => ({ ...p, [lbl]: !p[lbl] }));

  const hasAnyData = (nr: number) => {
    const v = pl[nr];
    if (!v) return false;
    return v.r.some(x => x !== 0) || v.b.some(x => x !== 0);
  };

  const rows = useMemo(() => {
    let curSec: string | null = null;
    return PL.map((row, idx) => {
      if (row.t === 'sp') return <tr key={`sp-${idx}`} className="h-3" />;
      if (row.t === 'sec') {
        curSec = row.lbl!;
        return (
          <tr key={`sec-${idx}`} className="cursor-pointer hover:bg-secondary/50" onClick={() => toggleSec(row.lbl!)}>
            <td colSpan={28} className="px-2 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              {collapsedSecs[row.lbl!] ? '▶' : '▼'} {row.lbl}
            </td>
          </tr>
        );
      }
      if (collapsedSecs[curSec!]) return null;

      if (row.t === 'acct') {
        if (!showZero && !hasAnyData(row.nr!)) return null;
        const v = pl[row.nr!];
        const ytdR = v ? sumArr(v.r, 0, nReal - 1) : 0;
        const ytdB = v ? sumArr(v.b, 0, nReal - 1) : 0;
        const yrB = v ? sumArr(v.b) : 0;
        const proj = nReal > 0 ? ytdR * 12 / nReal : yrB;
        return (
          <tr key={row.nr} className="hover:bg-secondary/30 border-b border-border/30">
            <td className="px-2 py-1 text-xs text-muted-foreground tabular-nums w-12">{row.nr}</td>
            <td className="px-2 py-1 text-xs truncate max-w-[180px]">{row.lbl}</td>
            {Array.from({ length: 12 }, (_, i) => [
              <Cell key={`r-${i}`} v={v?.r[i] || 0} realized dimmed={i >= nReal} />,
              <Cell key={`b-${i}`} v={v?.b[i] || 0} dimmed={i >= nReal} />,
            ])}
            <Cell v={ytdR} realized />
            <Cell v={ytdB} />
            <td className={`px-2 py-1 text-right text-xs tabular-nums font-medium ${ytdR - ytdB >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(ytdR - ytdB)}</td>
            <Cell v={proj} realized />
            <Cell v={yrB} />
          </tr>
        );
      }

      const isFinal = row.t === 'final';
      const isRes = row.t === 'res';
      const isTotal = row.t === 'total';
      if (isTotal || isRes || isFinal) {
        const v = pl[row.id!];
        if (!v) return null;
        const ytdR = sumArr(v.r, 0, nReal - 1);
        const ytdB = sumArr(v.b, 0, nReal - 1);
        const yrB = sumArr(v.b);
        const proj = nReal > 0 ? ytdR * 12 / nReal : yrB;
        const bgClass = isFinal ? 'bg-primary/10 font-bold' : isRes ? 'bg-[hsl(var(--budget-positive))]/5 font-semibold' : 'bg-secondary/50 font-medium';
        return (
          <tr key={`${row.t}-${row.id}`} className={`${bgClass} border-b border-border/50`}>
            <td className="px-2 py-1.5" />
            <td className={`px-2 py-1.5 text-xs ${isFinal ? 'text-sm' : ''}`}>{row.lbl}</td>
            {Array.from({ length: 12 }, (_, i) => {
              const vr = v.r[i], vb = v.b[i];
              const dimmed = i >= nReal;
              return [
                <td key={`r-${i}`} className={`px-2 py-1.5 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${vr >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{vr ? fmt(vr) : '–'}</td>,
                <td key={`b-${i}`} className={`px-2 py-1.5 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} text-muted-foreground`}>{vb ? fmt(vb) : '–'}</td>,
              ];
            })}
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${ytdR >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(ytdR)}</td>
            <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">{fmt(ytdB)}</td>
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums font-medium ${ytdR - ytdB >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(ytdR - ytdB)}</td>
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${proj >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(proj)}</td>
            <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">{fmt(yrB)}</td>
          </tr>
        );
      }
      return null;
    });
  }, [pl, nReal, showZero, collapsedSecs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Realiserede måneder:</span>
          <select value={nReal} onChange={e => setNReal(Number(e.target.value))} className="text-sm font-semibold text-primary bg-transparent border border-border rounded px-2 py-1 cursor-pointer">
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} ({MONTHS_FULL[i]})</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded" />
          Vis konti med nul
        </label>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Realiseret</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30 inline-block" />Budget</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" />Afvigelse</span>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border bg-card">
        <table className="w-full text-sm border-collapse min-w-[1800px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b-2">
              <th className="px-2 py-2 text-left text-xs font-semibold w-12">Nr.</th>
              <th className="px-2 py-2 text-left text-xs font-semibold">Navn</th>
              {MONTHS.map((m, i) => (
                <th key={m} colSpan={2} className={`px-1 py-2 text-center text-xs font-semibold ${i < nReal ? 'text-primary' : 'text-muted-foreground'}`}>
                  {m}{i < nReal ? ' ✓' : ''}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-semibold" colSpan={2}>YTD</th>
              <th className="px-2 py-2 text-center text-xs font-semibold">Afv.</th>
              <th className="px-2 py-2 text-center text-xs font-semibold">Proj.</th>
              <th className="px-2 py-2 text-center text-xs font-semibold">Budget</th>
            </tr>
            <tr className="border-b text-[10px] text-muted-foreground">
              <th colSpan={2} />
              {MONTHS.map(m => [
                <th key={`${m}-r`} className="px-1 py-0.5 text-center">Real</th>,
                <th key={`${m}-b`} className="px-1 py-0.5 text-center">Bud</th>,
              ])}
              <th className="px-1 py-0.5 text-center">Real</th>
              <th className="px-1 py-0.5 text-center">Bud</th>
              <th className="px-1 py-0.5 text-center">Diff</th>
              <th className="px-1 py-0.5 text-center">Proj.</th>
              <th className="px-1 py-0.5 text-center">Budget</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
