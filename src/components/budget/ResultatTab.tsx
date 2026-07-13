import { useState, useMemo, useRef, useEffect } from 'react';
import { MONTHS, MONTHS_FULL, type PLRow, type Transaction, type BskatRate, type LiquidityConfig } from '@/data/budget-constants';
import { fmt, sumArr, getRevenueAccounts, computeLiquiditySection, type PLValues } from '@/lib/budget-utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CellWithTooltip } from '@/components/budget/CellWithTooltip';
import type { FutureExpense } from '@/hooks/use-future-expenses';
import CommentButton from '@/components/CommentButton';

interface Props {
  pl: Record<string | number, PLValues>;
  nReal: number;
  setNReal: (n: number) => void;
  budget: Record<number, number[]>;
  setBudget: React.Dispatch<React.SetStateAction<Record<number, number[]>>>;
  budgetMode: 'fixed' | 'dynamic';
  setBudgetMode: (m: 'fixed' | 'dynamic') => void;
  activePL: PLRow[];
  txns?: Transaction[];
  pipelineJobs?: { konto: number; amount: number; probability: number; expected_payment_date: string; description: string; status: string }[];
  futureExpenses?: FutureExpense[];
  futureExpensesBudget?: Record<number, number[]>;
  momsBetalt?: number[];
  bskat?: BskatRate[];
  andenGeld?: number;
  liquidityConfig?: LiquidityConfig;
}

function Cell({ v, realized, dimmed }: { v: number; realized?: boolean; dimmed?: boolean }) {
  if (v === 0 || v == null || isNaN(v)) return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : 'text-muted-foreground'}`}>–</td>;
  const color = realized
    ? (v < 0 ? 'text-destructive' : 'text-primary')
    : (v < 0 ? 'text-destructive/70' : 'text-[hsl(142,35%,30%)]');
  return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${color}`}>{fmt(v)}</td>;
}

function EditableBudgetCell({ value, dimmed, onSave, isExpense }: { value: number; dimmed?: boolean; onSave: (v: number) => void; isExpense?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = (raw: number) => {
    if (raw === 0) { onSave(0); return; }
    // Expense accounts: always store as negative
    if (isExpense && raw > 0) raw = -raw;
    // Revenue accounts: always store as positive
    if (!isExpense && raw < 0) raw = -raw;
    onSave(raw);
  };

  if (editing) {
    return (
      <td className="px-0.5 py-0.5">
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { handleSave(Number(draft) || 0); setEditing(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { handleSave(Number(draft) || 0); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full text-right text-xs tabular-nums border border-primary rounded px-1 py-0.5 bg-primary/5 text-primary outline-none"
        />
      </td>
    );
  }

  // Show actual stored value with correct sign (expenses are negative)
  const display = value === 0 || isNaN(value) ? '–' : fmt(value);
  const color = value < 0 ? 'text-destructive/70' : value > 0 ? 'text-[hsl(142,40%,35%)]' : 'text-muted-foreground';

  return (
    <td
      className={`px-2 py-1 text-right text-xs tabular-nums cursor-pointer hover:bg-primary/10 rounded transition-colors ${dimmed ? 'opacity-30' : ''} ${color}`}
      onClick={() => { setDraft(String(Math.abs(value) || '')); setEditing(true); }}
      title={isExpense ? 'Udgiftskonto – indtast positivt tal, gemmes som negativt' : 'Indtægtskonto – klik for at redigere budget'}
    >
      {display}
    </td>
  );
}
function FixedBudgetCell({ budgetValue, futureValue, dimmed, isExpense, onSave }: {
  budgetValue: number; futureValue: number; dimmed?: boolean; isExpense?: boolean; onSave: (v: number) => void;
}) {
  if (futureValue !== 0) {
    const color = futureValue > 0 ? 'text-[hsl(142,40%,35%)]' : futureValue < 0 ? 'text-destructive' : 'text-muted-foreground';
    return (
      <td className={`px-1.5 py-0.5 ${dimmed ? 'opacity-30' : ''}`} title="Fra Fremtidige Udgifter">
        <div className={`border border-dashed border-amber-500/60 rounded bg-amber-50/30 px-1 py-0.5 text-right text-xs tabular-nums ${color}`}>
          {fmt(futureValue)}
        </div>
      </td>
    );
  }
  return <EditableBudgetCell value={budgetValue} dimmed={dimmed} isExpense={isExpense} onSave={onSave} />;
}

export default function ResultatTab({ pl, nReal, setNReal, budget, setBudget, budgetMode, setBudgetMode, activePL, txns = [], pipelineJobs = [], futureExpenses = [], futureExpensesBudget = {}, momsBetalt = [0,0,0,0], bskat = [], andenGeld = 0, liquidityConfig }: Props) {
  const isDynamic = budgetMode === 'dynamic';

  // Determine which accounts are revenue (positive convention) vs expense (negative convention)
  const revenueAccounts = useMemo(() => getRevenueAccounts(activePL), [activePL]);
  const isExpenseAccount = (nr: number) => !revenueAccounts.has(nr);
  const [showZero, setShowZero] = useState(false);
  const [collapsedSecs, setCollapsedSecs] = useState<Record<string, boolean>>({});

  const plForDisplay = useMemo(() => {
    const endIdx = activePL.findIndex(r => r.id === 't4990');
    if (endIdx >= 0) return activePL.slice(0, endIdx + 1);
    const finalIdx = activePL.findIndex(r => r.t === 'final');
    if (finalIdx >= 0) return activePL.slice(0, finalIdx + 1);
    return activePL;
  }, [activePL]);
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
    for (const row of plForDisplay) {
      if (row.t === 'sec') curS = row.lbl!;
      if (row.t === 'acct' && curS && hasAnyData(row.nr!)) secs.add(curS);
    }
    return secs;
  }, [showZero, plForDisplay, pl]);

  const rows = useMemo(() => {
    let curSec: string | null = null;
    return plForDisplay.map((row, idx) => {
      if (row.t === 'sp') {
        if (!showZero && visibleSections && curSec && !visibleSections.has(curSec)) return null;
        return <tr key={`sp-${idx}`} className="h-3" />;
      }
      if (row.t === 'sec') {
        curSec = row.lbl!;
        if (!showZero && visibleSections && !visibleSections.has(curSec)) return null;
        return (
          <tr key={`sec-${idx}`} className="cursor-pointer hover:bg-secondary/50" onClick={() => toggleSec(row.lbl!)}>
            <td className="sticky left-0 z-20 bg-card px-2 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground" />
            <td className="sticky left-[48px] z-20 bg-card px-2 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground border-r border-border/30">
              {collapsedSecs[row.lbl!] ? '▶' : '▼'} {row.lbl}
            </td>
            <td colSpan={29} />
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
            <td className="px-2 py-1 text-xs text-muted-foreground tabular-nums w-12 sticky left-0 z-20 bg-card">
              <span className="flex items-center gap-0.5">
                {row.nr}
                <CommentButton contextType="resultat" contextRef={String(row.nr)} contextLabel={`Konto ${row.nr} – ${row.lbl}`} />
              </span>
            </td>
            <td className="px-2 py-1 text-xs truncate max-w-[180px] sticky left-[48px] z-20 bg-card border-r border-border/30">{row.lbl}</td>
            {Array.from({ length: 12 }, (_, i) => [
              <CellWithTooltip key={`r-${i}`} value={v?.r[i] || 0} realized dimmed={i >= nReal}
                accountNr={row.nr} monthIndex={i} txns={txns} plRows={activePL} />,
              isDynamic ? (
                <CellWithTooltip key={`b-${i}`} value={v?.b[i] || 0} dimmed={i >= nReal}
                  accountNr={row.nr} monthIndex={i} pipelineJobs={pipelineJobs} futureExpenses={futureExpenses}
                  budgetBase={budget[row.nr!]?.[i] || 0} />
              ) : (
                <FixedBudgetCell
                  key={`b-${i}`}
                  budgetValue={v?.b[i] || 0}
                  futureValue={futureExpensesBudget[row.nr!]?.[i] || 0}
                  dimmed={i >= nReal}
                  isExpense={isExpenseAccount(row.nr!)}
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
        const stickyBg = isFinal ? 'bg-[hsl(210,20%,93%)]' : isRes ? 'bg-[hsl(142,30%,95%)]' : 'bg-[hsl(210,20%,95%)]';
        const bgClass = isFinal ? 'bg-primary/10 font-bold' : isRes ? 'bg-[hsl(var(--budget-positive))]/5 font-semibold' : 'bg-secondary/50 font-medium';
        return (
          <tr key={`${row.t}-${row.id}`} className={`${bgClass} border-b border-border/50`}>
            <td className={`px-2 py-1.5 sticky left-0 z-20 ${stickyBg}`} />
            <td className={`px-2 py-1.5 text-xs ${isFinal ? 'text-sm' : ''} sticky left-[48px] z-20 border-r border-border/30 ${stickyBg}`}>{row.lbl}</td>
            {Array.from({ length: 12 }, (_, i) => {
              const vr = v.r[i], vb = v.b[i];
              const dimmed = i >= nReal;
              return [
                <CellWithTooltip key={`r-${i}`} value={vr} realized dimmed={dimmed}
                  monthIndex={i} totalFormula={row.sum} pl={pl} plRows={plForDisplay} txns={txns} />,
                <CellWithTooltip key={`b-${i}`} value={vb} dimmed={dimmed}
                  monthIndex={i} totalFormula={row.sum} pl={pl} plRows={plForDisplay}
                  pipelineJobs={pipelineJobs} futureExpenses={futureExpenses} />,
              ];
            })}
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${ytdR >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(ytdR)}</td>
            <td className="px-2 py-1.5 text-right text-xs tabular-nums text-foreground/60">{fmt(ytdB)}</td>
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums font-medium ${ytdR - ytdB >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(ytdR - ytdB)}</td>
            <td className={`px-2 py-1.5 text-right text-xs tabular-nums ${proj >= 0 ? 'text-[hsl(var(--budget-positive))]' : 'text-destructive'}`}>{fmt(proj)}</td>
            <td className="px-2 py-1.5 text-right text-xs tabular-nums text-foreground/60">{fmt(yrB)}</td>
          </tr>
        );
      }
      return null;
    });
  }, [pl, nReal, showZero, collapsedSecs, budget, plForDisplay, visibleSections]);

  const liquidityRows = useMemo(() => {
    if (!liquidityConfig) return [];
    return computeLiquiditySection({
      pl, plRows: activePL, txns, momsBetalt, bskat, andenGeld,
      config: liquidityConfig, nReal,
    });
  }, [pl, activePL, txns, momsBetalt, bskat, andenGeld, liquidityConfig, nReal]);

  const liqCollapsed = collapsedSecs['__liq__'];
  const liqSection = useMemo(() => {
    if (liquidityRows.length === 0) return null;
    const nodes: React.ReactNode[] = [];
    nodes.push(
      <tr key="liq-sp" className="h-3" />,
      <tr key="liq-sec" className="cursor-pointer hover:bg-secondary/50" onClick={() => toggleSec('__liq__')}>
        <td className="sticky left-0 z-20 bg-card px-2 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground" />
        <td className="sticky left-[48px] z-20 bg-card px-2 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground border-r border-border/30">
          {liqCollapsed ? '▶' : '▼'} 💧 Likviditet & gæld
        </td>
        <td colSpan={29} />
      </tr>
    );
    if (liqCollapsed) return nodes;
    liquidityRows.forEach(row => {
      const isSaldo = row.id === 'liq_drift';
      const isNet = row.id === 'liq_nettomoms';
      const bgClass = isSaldo ? 'bg-primary/5 font-semibold' : isNet ? 'bg-secondary/40 font-medium' : '';
      const lastRealIdx = Math.max(0, nReal - 1);
      const ytdR = isSaldo ? row.r[lastRealIdx] : sumArr(row.r);
      const ytdB = isSaldo ? row.b[lastRealIdx] : sumArr(row.b, 0, nReal - 1);
      const yrB = isSaldo ? row.b[11] : sumArr(row.b);
      const proj = isSaldo
        ? (row.proj ? row.proj[11] : row.b[11])
        : sumArr(row.r) + sumArr(row.b, nReal, 11);
      const afvig = isSaldo ? ytdR - ytdB : null;
      nodes.push(
        <tr key={row.id} className={`hover:bg-secondary/30 border-b border-border/30 ${bgClass}`}>
          <td className="px-2 py-1 text-xs text-muted-foreground tabular-nums w-12 sticky left-0 z-20 bg-card" />
          <td className="px-2 py-1 text-xs truncate max-w-[220px] sticky left-[48px] z-20 bg-card border-r border-border/30">{row.label}</td>
          {Array.from({ length: 12 }, (_, i) => {
            const vr = row.r[i], vb = row.b[i];
            return [
              <Cell key={`r-${i}`} v={vr} realized />,
              <Cell key={`b-${i}`} v={vb} dimmed={i < nReal} />,
            ];
          })}
          <Cell v={ytdR} realized />
          <Cell v={ytdB} />
          {afvig !== null
            ? <Cell v={afvig} />
            : <td className="px-2 py-1 text-right text-xs tabular-nums text-muted-foreground">–</td>}
          <Cell v={proj} realized />
          <Cell v={yrB} />
        </tr>
      );
    });
    return nodes;
  }, [liquidityRows, liqCollapsed, nReal]);

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
        <table className="w-full text-sm border-collapse min-w-[1800px] mr-12">
          <thead className="sticky top-0 z-30 bg-card">
            <tr className="border-b-2">
              <th className="px-2 py-2 text-left text-xs font-semibold w-12 sticky left-0 z-30 bg-card">Nr.</th>
              <th className="px-2 py-2 text-left text-xs font-semibold sticky left-[48px] z-30 bg-card min-w-[180px] border-r border-border/30">Navn</th>
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
              <th className="sticky left-0 z-30 bg-card" />
              <th className="sticky left-[48px] z-30 bg-card border-r border-border/30" />
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
          <tbody>{rows}{liqSection}</tbody>
        </table>
      </div>
    </div>
  );
}
