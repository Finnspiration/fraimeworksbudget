import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBudgetState } from '@/hooks/use-budget-state';
import { COMPANY, YEAR } from '@/data/budget-constants';
import OverblikTab from '@/components/budget/OverblikTab';
import ResultatTab from '@/components/budget/ResultatTab';
import SkatTab from '@/components/budget/SkatTab';
import ImportTab from '@/components/budget/ImportTab';
import { BarChart3, Table, Receipt, FileSpreadsheet } from 'lucide-react';

export default function Index() {
  const state = useBudgetState();
  const [tab, setTab] = useState('overblik');

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
            <TabsTrigger value="skat" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Skat & Moms</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><Upload className="h-3.5 w-3.5" />Import</TabsTrigger>
          </TabsList>

          <TabsContent value="overblik">
            <OverblikTab pl={state.pl} nReal={state.nReal} txns={state.txns} />
          </TabsContent>
          <TabsContent value="resultat">
            <ResultatTab pl={state.pl} nReal={state.nReal} setNReal={state.setNReal} budget={state.budget} setBudget={state.setBudget} budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode} />
          </TabsContent>
          <TabsContent value="skat">
            <SkatTab pl={state.pl} txns={state.txns} nReal={state.nReal}
              momsBetalt={state.momsBetalt} setMomsBetalt={state.setMomsBetalt}
              bskat={state.bskat} setBskat={state.setBskat}
              andenGeld={state.andenGeld} setAndenGeld={state.setAndenGeld}
              skatPct={state.skatPct} setSkatPct={state.setSkatPct} />
          </TabsContent>
          <TabsContent value="import">
            <ImportTab txns={state.txns} setTxns={state.setTxns} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
