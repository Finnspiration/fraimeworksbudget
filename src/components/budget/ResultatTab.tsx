import { useState, useMemo, useRef, useEffect } from 'react';
import { MONTHS, MONTHS_FULL, type PLRow } from '@/data/budget-constants';
import { fmt, sumArr, type PLValues } from '@/lib/budget-utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Props {
  pl: Record<string | number, PLValues>;
  nReal: number;
  setNReal: (n: number) => void;
  budget: Record<number, number[]>;
  setBudget: React.Dispatch<React.SetStateAction<Record<number, number[]>>>;
  budgetMode: 'fixed' | 'dynamic';
  setBudgetMode: (m: 'fixed' | 'dynamic') => void;
  activePL: PLRow[];
}

function Cell({ v, realized, dimmed }: { v: number; realized?: boolean; dimmed?: boolean }) {
  if (v === 0 || v == null || isNaN(v)) return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : 'text-muted-foreground'}`}>–</td>;
  const color = realized
    ? (v < 0 ? 'text-destructive' : 'text-primary')
    : (v < 0 ? 'text-foreground/50' : 'text-[hsl(142,40%,35%)]');
  return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${color}`}>{fmt(v)}</td>;
}

function EditableBudgetCell({ value, dimmed, onSave }: { value: number; dimmed?: boolean; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <td className="px-0.5 py-0.5">
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onSave(Number(draft) || 0); setEditing(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(Number(draft) || 0); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full text-right text-xs tabular-nums border border-primary rounded px-1 py-0.5 bg-primary/5 text-primary outline-none"
        />
      </td>
    );
  }

  const display = value === 0 || isNaN(value) ? '–' : fmt(value);
  const color = value < 0 ? 'text-muted-foreground' : value > 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-muted-foreground';

  return (
    <td
      className={`px-2 py-1 text-right text-xs tabular-nums cursor-pointer hover:bg-primary/10 rounded transition-colors ${dimmed ? 'opacity-30' : ''} ${color}`}
      onClick={() => { setDraft(String(value || '')); setEditing(true); }}
      title="Klik for at redigere budget"
    >
      {display}
    </td>
  );
}

export default function ResultatTab({ pl, nReal, setNReal, budget, setBudget, budgetMode, setBudgetMode, activePL }: Props) {
  const isDynamic = budgetMode === 'dynamic';
  const [showZero, setShowZero] = useState(false);
  const [collapsedSecs, setCollapsedSecs] = useState<Record<string, boolean>>({});
  const toggleSec = (lbl: string) => setCollapsedSecs(p => ({ ...p, [lbl]: !p[lbl] }));

  const updateBudget = (nr: number, monthIdx: number, value: number) => {
    setBudget(prev => {
      const arr = prev[nr] ? [...prev[nr]] : new Array(12).fill(0);
      arr[monthIdx] = value;
      return { ...prev, [nr]: arr };
    });
  };

  const hasAnyData = (nr: number) => {
    const v = pl[nr];
    if (!v) return false;
    return v.r.some(x => x !== 0) || v.b.some(x => x !== 0);
  };

  const visibleSections = useMemo(() => {
    if (showZero) return null;
    const secs = new Set<string>();
    let curS: string | null = null;
    for (const row of activePL) {
      if (row.t === 'sec') curS = row.lbl!;
      if (row.t === 'acct' && curS && hasAnyData(row.nr!)) secs.add(curS);
    }
    return secs;
  }, [showZero, activePL, pl]);

  const rows = useMemo(() => {
    let curSec: string | null = null;
    return activePL.map((row, idx) => {
      if (row.t === 'sp') {
        if (!showZero && visibleSections && curSec && !visibleSections.has(curSec)) return null;
        return <tr key={`sp-${idx}`} className="h-3" />;
      }
      if (row.t === 'sec') {
        curSec = row.lbl!;
        if (!showZero && visibleSections && !visibleSections.has(curSec)) return null;
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
              isDynamic ? (
                <Cell key={`b-${i}`} v={v?.b[i] || 0} dimmed={i >= nReal} />
              ) : (
                <EditableBudgetCell
                  key={`b-${i}`}
                  value={v?.b[i] || 0}
                  dimmed={i >= nReal}
                  onSave={(val) => updateBudget(row.nr!, i, val)}
                />
              ),
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
        if (!showZero) {
          const hasData = v.r.some(x => x !== 0) || v.b.some(x => x !== 0);
          if (!hasData) return null;
        }
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
  }, [pl, nReal, showZero, collapsedSecs, budget, activePL, visibleSections]);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{isDynamic ? 'Dynamisk' : 'Fast'} budget</span>
            <Switch checked={isDynamic} onCheckedChange={c => setBudgetMode(c ? 'dynamic' : 'fixed')} />
          </div>
          {isDynamic && <Badge variant="secondary" className="text-xs">Rolling forecast</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Realiseret</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30 inline-block" />{isDynamic ? 'Dynamisk budget' : 'Budget (klik for redigering)'}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" />Afvigelse</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-220px)] rounded-lg border bg-card">
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
