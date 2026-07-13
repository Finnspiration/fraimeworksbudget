import { useState, useMemo } from 'react';
import logo from '@/assets/logo.png';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDbState } from '@/hooks/use-db-state';
import { computePL, getRevenueAccounts } from '@/lib/budget-utils';
import { COMPANY, YEAR } from '@/data/budget-constants';
import OverblikTab from '@/components/budget/OverblikTab';
import ResultatTab from '@/components/budget/ResultatTab';
import SkatTab from '@/components/budget/SkatTab';
import ImportTab from '@/components/budget/ImportTab';
import PipelineTab from '@/components/budget/PipelineTab';
import { usePipelineJobs } from '@/hooks/use-pipeline';
import { useFutureExpenses } from '@/hooks/use-future-expenses';
import FutureExpensesTab from '@/components/budget/FutureExpensesTab';
import { BarChart3, Table, Receipt, FileSpreadsheet, Target, CalendarClock, Loader2, MessageCircle, CheckSquare, Shield, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

export default function Index() {
  const { profile, isAdmin, signOut } = useAuth();
  const { unreadChat, unreadTasks } = useUnreadCounts();
  const state = useDbState();
  const [tab, setTab] = useState('overblik');
  const { data: pipelineJobs = [] } = usePipelineJobs();
  const { activeExpenses, matchAgainstTransactions } = useFutureExpenses();

  // Build future expenses budget map (konto → 12-month array of sums)
  const futureExpensesBudget = useMemo(() => {
    const map: Record<number, number[]> = {};
    activeExpenses.forEach(exp => {
      const d = new Date(exp.dato);
      if (isNaN(d.getTime()) || d.getFullYear() !== YEAR) return;
      const month = d.getMonth();
      if (!map[exp.konto]) map[exp.konto] = new Array(12).fill(0);
      // Expense accounts (>= 1300) stored as negative, same convention as manual budget
      const signed = exp.konto >= 1300 ? -Math.abs(exp.belob) : exp.belob;
      map[exp.konto][month] += signed;
    });
    return map;
  }, [activeExpenses]);

  // Merge weighted pipeline into budget for PL calculation
  const mergedBudget = useMemo(() => {
    const base = { ...state.activeBudget };
    for (const k of Object.keys(base)) {
      base[Number(k)] = [...base[Number(k)]];
    }

    if (state.budgetMode === 'dynamic') {
      // Rolling forecast: only add pipeline (no future expenses)
      pipelineJobs.forEach(job => {
        if (job.status === 'tabt') return;
        const d = new Date(job.expected_payment_date);
        if (isNaN(d.getTime()) || d.getFullYear() !== YEAR) return;
        const month = d.getMonth();
        const weighted = Number(job.amount) * job.probability / 100;
        const konto = job.konto;
        if (!base[konto]) base[konto] = new Array(12).fill(0);
        base[konto][month] += weighted;
      });
    } else {
      // Fixed budget: overlay future expenses (priority over manual entries)
      for (const [konto, months] of Object.entries(futureExpensesBudget)) {
        const k = Number(konto);
        if (!base[k]) base[k] = new Array(12).fill(0);
        months.forEach((val, i) => {
          if (val !== 0) {
            base[k][i] = val; // already correctly signed
          }
        });
      }
    }

    return base;
  }, [state.activeBudget, state.budgetMode, pipelineJobs, futureExpensesBudget]);

  // Recompute PL with merged budget
  const mergedPL = useMemo(() => {
    return computePL(state.realized, mergedBudget, state.activePL);
  }, [state.realized, mergedBudget, state.activePL]);

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Indlæser data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="#" onClick={(e) => { e.preventDefault(); setTab('overblik'); }} className="cursor-pointer"><img src={logo} alt="FraimeWorks" className="h-8" /></a>
            <p className="text-xs text-muted-foreground">Budget & regnskab {YEAR}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/chat"><Button variant="ghost" size="sm" className="gap-1.5 relative"><MessageCircle className="h-3.5 w-3.5" />Chat{unreadChat > 0 && <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">{unreadChat > 99 ? '99+' : unreadChat}</Badge>}</Button></Link>
            <Link to="/todo"><Button variant="ghost" size="sm" className="gap-1.5 relative"><CheckSquare className="h-3.5 w-3.5" />Opgaver{unreadTasks > 0 && <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">{unreadTasks > 99 ? '99+' : unreadTasks}</Badge>}</Button></Link>
            {isAdmin && <Link to="/admin"><Button variant="ghost" size="sm" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Admin</Button></Link>}
            <span className="text-xs text-muted-foreground hidden sm:inline">{profile?.name}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">{state.txns.length} posteringer</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--budget-positive))]" />
            <span className="hidden sm:inline text-xs text-muted-foreground">{state.nReal} mdr.</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5"><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overblik" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Overblik</TabsTrigger>
            <TabsTrigger value="resultat" className="gap-1.5"><Table className="h-3.5 w-3.5" />Resultatopgørelse</TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5"><Target className="h-3.5 w-3.5" />Pipeline</TabsTrigger>
            <TabsTrigger value="udgifter" className="gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Fremtidige udgifter</TabsTrigger>
            <TabsTrigger value="skat" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Skat & Moms</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Kassekladde</TabsTrigger>
          </TabsList>

          <TabsContent value="overblik">
            <OverblikTab pl={mergedPL} nReal={state.nReal} txns={state.txns} activePL={state.activePL} pipelineJobs={pipelineJobs}
              budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode}
              momsBetalt={state.momsBetalt} bskat={state.bskat}
              andenGeld={state.andenGeld} skatPct={state.skatPct}
              virksomhedstype={state.virksomhedstype} />
          </TabsContent>
          <TabsContent value="resultat">
            <ResultatTab pl={mergedPL} nReal={state.nReal} setNReal={state.setNReal} budget={mergedBudget} setBudget={state.setBudget} budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode} activePL={state.activePL}
              txns={state.txns} pipelineJobs={pipelineJobs} futureExpenses={activeExpenses} futureExpensesBudget={futureExpensesBudget} />
          </TabsContent>
          <TabsContent value="pipeline">
            <PipelineTab activePL={state.activePL} />
          </TabsContent>
          <TabsContent value="skat">
            <SkatTab pl={mergedPL} txns={state.txns} nReal={state.nReal} activePL={state.activePL}
              momsBetalt={state.momsBetalt} setMomsBetalt={state.setMomsBetalt}
              bskat={state.bskat} setBskat={state.setBskat}
              andenGeld={state.andenGeld} setAndenGeld={state.setAndenGeld}
              skatPct={state.skatPct} setSkatPct={state.setSkatPct}
              virksomhedstype={state.virksomhedstype} setVirksomhedstype={state.setVirksomhedstype}
              budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode} />
          </TabsContent>
          <TabsContent value="udgifter">
            <FutureExpensesTab activePL={state.activePL} txns={state.txns} matchAgainstTransactions={matchAgainstTransactions} />
          </TabsContent>
          <TabsContent value="import">
            <ImportTab txns={state.txns} setTxns={state.setTxns} customPL={state.customPL} setCustomPL={state.setCustomPL}
              onImportComplete={async (allTxns) => {
                const count = await matchAgainstTransactions(allTxns);
                if (count > 0) {
                  const { toast } = await import('sonner');
                  toast.success(`✓ ${count} fremtidige udgifter blev matchet`);
                }
              }} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
