import { useMemo } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { fmt, fmtDec } from '@/lib/budget-utils';
import type { Transaction, PLRow } from '@/data/budget-constants';
import type { FutureExpense } from '@/hooks/use-future-expenses';

interface CellWithTooltipProps {
  value: number;
  realized?: boolean;
  dimmed?: boolean;
  accountNr?: number;
  monthIndex: number;
  txns?: Transaction[];
  pipelineJobs?: { konto: number; amount: number; probability: number; expected_payment_date: string; description: string; status: string }[];
  futureExpenses?: FutureExpense[];
  // For total rows
  totalFormula?: string;
  pl?: Record<string | number, { r: number[]; b: number[] }>;
  plRows?: PLRow[];
  isBudgetCell?: boolean;
  budgetBase?: number;
}

function netBelob(belob: number, moms: string | null): number {
  return moms === 'I25' || moms === 'U25' ? belob / 1.25 : Number(belob);
}

export function CellWithTooltip({
  value, realized, dimmed, accountNr, monthIndex,
  txns = [], pipelineJobs = [], futureExpenses = [],
  totalFormula, pl, plRows, isBudgetCell, budgetBase,
}: CellWithTooltipProps) {
  const color = realized
    ? (value < 0 ? 'text-destructive' : 'text-primary')
    : (value < 0 ? 'text-destructive/70' : 'text-[hsl(142,35%,30%)]');

  // Build tooltip content
  const tooltipContent = useMemo(() => {
    if (value === 0 || value == null || isNaN(value)) return null;

    // Account-level realized cell
    if (accountNr != null && realized && !totalFormula) {
      const month = monthIndex + 1;
      const matching = txns.filter(t => {
        if (t.konto !== accountNr) return false;
        if (!t.dato) return false;
        const d = new Date(t.dato);
        return d.getMonth() === monthIndex && !isNaN(d.getTime());
      });
      if (matching.length === 0) return null;
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Konto {accountNr} — {matching.length} posteringer</p>
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-[11px]">
              <tbody>
                {matching.map((t, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="pr-2 py-0.5 text-muted-foreground whitespace-nowrap">{t.dato}</td>
                    <td className="pr-2 py-0.5 truncate max-w-[150px]">{t.tekst}</td>
                    <td className="py-0.5 text-right tabular-nums whitespace-nowrap">{fmtDec(-netBelob(t.belob, t.moms))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-medium text-right border-t pt-1">Sum: {fmt(value)}</p>
        </div>
      );
    }

    // Account-level budget cell
    if (accountNr != null && !realized && !totalFormula) {
      const parts: { label: string; amount: number }[] = [];
      if (budgetBase) parts.push({ label: 'Fast budget', amount: budgetBase });
      const pipeMatching = pipelineJobs.filter(j => {
        if (j.status === 'tabt' || j.konto !== accountNr) return false;
        const d = new Date(j.expected_payment_date);
        return d.getMonth() === monthIndex && !isNaN(d.getTime());
      });
      pipeMatching.forEach(j => parts.push({ label: `Pipeline: ${j.description}`, amount: j.amount * j.probability / 100 }));
      const feMatching = futureExpenses.filter(e => {
        if (e.konto !== accountNr) return false;
        if (!e.dato) return false;
        const d = new Date(e.dato);
        return d.getMonth() === monthIndex && !isNaN(d.getTime());
      });
      feMatching.forEach(e => parts.push({ label: `Fremtidig: ${e.tekst}`, amount: e.belob }));
      if (parts.length <= 1) return null;
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Budget konto {accountNr}</p>
          <table className="w-full text-[11px]">
            <tbody>
              {parts.map((p, i) => (
                <tr key={i} className="border-b border-border/20">
                  <td className="pr-2 py-0.5 truncate max-w-[180px]">{p.label}</td>
                  <td className="py-0.5 text-right tabular-nums whitespace-nowrap">{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs font-medium text-right border-t pt-1">Sum: {fmt(value)}</p>
        </div>
      );
    }

    // Total/res/final row
    if (totalFormula && pl && plRows) {
      const parts: { label: string; nr?: number; id?: string; amount: number }[] = [];
      totalFormula.split('+').forEach(p => {
        p = p.trim();
        if (p.startsWith('grp:')) {
          const g = p.slice(4);
          plRows.filter(a => a.t === 'acct' && a.grp === g).forEach(a => {
            const v = pl[a.nr!];
            const amount = realized ? v?.r[monthIndex] || 0 : v?.b[monthIndex] || 0;
            if (amount !== 0) parts.push({ label: a.lbl || '', nr: a.nr, amount });
          });
        } else if (p.startsWith('range:')) {
          const [start, end] = p.slice(6).split('-').map(Number);
          plRows.filter(a => a.t === 'acct' && a.nr! >= start && a.nr! <= end).forEach(a => {
            const v = pl[a.nr!];
            const amount = realized ? v?.r[monthIndex] || 0 : v?.b[monthIndex] || 0;
            if (amount !== 0) parts.push({ label: a.lbl || '', nr: a.nr, amount });
          });
        } else if (p.startsWith('id:')) {
          const id = p.slice(3);
          const row = plRows.find(r => r.id === id);
          const v = pl[id];
          const amount = realized ? v?.r[monthIndex] || 0 : v?.b[monthIndex] || 0;
          if (amount !== 0) parts.push({ label: row?.lbl || id, id, amount });
        }
      });
      if (parts.length === 0) return null;
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{realized ? 'Realiseret' : 'Budget'} — sammensætning</p>
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-[11px]">
              <tbody>
                {parts.map((p, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="pr-2 py-0.5">{p.nr ? <span className="font-mono text-muted-foreground mr-1">{p.nr}</span> : null}{p.label}</td>
                    <td className="py-0.5 text-right tabular-nums whitespace-nowrap">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-medium text-right border-t pt-1">Sum: {fmt(value)}</p>
        </div>
      );
    }

    return null;
  }, [accountNr, monthIndex, realized, txns, pipelineJobs, futureExpenses, totalFormula, pl, plRows, budgetBase, value]);

  if (value === 0 || value == null || isNaN(value)) {
    return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : 'text-muted-foreground'}`}>–</td>;
  }

  if (!tooltipContent) {
    return <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${color}`}>{fmt(value)}</td>;
  }

  return (
    <td className={`px-2 py-1 text-right text-xs tabular-nums ${dimmed ? 'opacity-30' : ''} ${color}`}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span className="cursor-help border-b border-dotted border-foreground/40">{fmt(value)}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-3" side="bottom" align="end">
          {tooltipContent}
        </HoverCardContent>
      </HoverCard>
    </td>
  );
}
