import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBudgetState } from '@/hooks/use-budget-state';
import { computePL } from '@/lib/budget-utils';
import { COMPANY, YEAR } from '@/data/budget-constants';
import OverblikTab from '@/components/budget/OverblikTab';
import ResultatTab from '@/components/budget/ResultatTab';
import SkatTab from '@/components/budget/SkatTab';
import ImportTab from '@/components/budget/ImportTab';
import PipelineTab from '@/components/budget/PipelineTab';
import { usePipelineJobs } from '@/hooks/use-pipeline';
import { BarChart3, Table, Receipt, FileSpreadsheet, Target } from 'lucide-react';

export default function Index() {
  const state = useBudgetState();
  const [tab, setTab] = useState('overblik');
  const { data: pipelineJobs = [] } = usePipelineJobs();

  // Merge weighted pipeline into budget for PL calculation
  const mergedBudget = useMemo(() => {
    const base = { ...state.budget };
    // Deep-copy existing arrays
    for (const k of Object.keys(base)) {
      base[Number(k)] = [...base[Number(k)]];
    }
    // Add pipeline forecast
    pipelineJobs.forEach(job => {
      if (job.status === 'tabt') return;
      const d = new Date(job.expected_payment_date);
      if (isNaN(d.getTime()) || d.getFullYear() !== YEAR) return;
      const month = d.getMonth();
      const weighted = Number(job.amount) * job.probability / 100;
      const konto = job.konto;
      if (!base[konto]) {
        base[konto] = new Array(12).fill(0);
      }
      base[konto][month] += weighted;
    });
    return base;
  }, [state.budget, pipelineJobs]);

  // Recompute PL with merged budget
  const mergedPL = useMemo(() => {
    return computePL(state.realized, mergedBudget, state.activePL);
  }, [state.realized, mergedBudget, state.activePL]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{COMPANY}</h1>
            <p className="text-xs text-muted-foreground">Budget & regnskab {YEAR}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{state.txns.length} posteringer</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--budget-positive))]" />
            <span className="hidden sm:inline">{state.nReal} mdr. realiseret</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overblik" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Overblik</TabsTrigger>
            <TabsTrigger value="resultat" className="gap-1.5"><Table className="h-3.5 w-3.5" />Resultatopgørelse</TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5"><Target className="h-3.5 w-3.5" />Pipeline</TabsTrigger>
            <TabsTrigger value="skat" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Skat & Moms</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Kassekladde</TabsTrigger>
          </TabsList>

          <TabsContent value="overblik">
            <OverblikTab pl={mergedPL} nReal={state.nReal} txns={state.txns} activePL={state.activePL} pipelineJobs={pipelineJobs} />
          </TabsContent>
          <TabsContent value="resultat">
            <ResultatTab pl={mergedPL} nReal={state.nReal} setNReal={state.setNReal} budget={mergedBudget} setBudget={state.setBudget} budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode} activePL={state.activePL} />
          </TabsContent>
          <TabsContent value="pipeline">
            <PipelineTab activePL={state.activePL} />
          </TabsContent>
          <TabsContent value="skat">
            <SkatTab pl={mergedPL} txns={state.txns} nReal={state.nReal}
              momsBetalt={state.momsBetalt} setMomsBetalt={state.setMomsBetalt}
              bskat={state.bskat} setBskat={state.setBskat}
              andenGeld={state.andenGeld} setAndenGeld={state.setAndenGeld}
              skatPct={state.skatPct} setSkatPct={state.setSkatPct}
              virksomhedstype={state.virksomhedstype} setVirksomhedstype={state.setVirksomhedstype} />
          </TabsContent>
          <TabsContent value="import">
            <ImportTab txns={state.txns} setTxns={state.setTxns} customPL={state.customPL} setCustomPL={state.setCustomPL} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
