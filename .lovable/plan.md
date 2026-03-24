

# Fix: Budget-beregning er forkert i fast budget-tilstand

## Problem
I `Index.tsx` (linje 28-53) bliver pipeline-jobs og fremtidige udgifter **altid** lagt oven i budgettet via `mergedBudget`, uanset om brugeren er i fast eller dynamisk tilstand. Det betyder at fx konto 1010 med fast budget på 50.000/md får pipeline-omsætning lagt oveni, så budget-kolonnen viser 50.000 + pipeline-vægtede beløb = oppustede tal. Det akkumulerer til et resultat på 1.130.929 kr., som er helt urealistisk.

## Årsag
```typescript
// Index.tsx linje 28-53 — kører ALTID, uanset budgetMode
const mergedBudget = useMemo(() => {
  const base = { ...state.activeBudget };
  // pipeline tilføjes ALTID
  pipelineJobs.forEach(job => { ... base[konto][month] += weighted; });
  // future expenses tilføjes ALTID
  activeExpenses.forEach(exp => { ... base[exp.konto][month] += exp.belob; });
  return base;
}, [...]);
```

## Løsning
Pipeline og fremtidige udgifter skal **kun** merges ind i budgettet i **dynamisk** tilstand. I fast budget-tilstand skal budgettet udelukkende bestå af de manuelt indtastede værdier.

### Fil: `src/pages/Index.tsx`

Wrap pipeline/future-expense-tilføjelsen i en check på `state.budgetMode === 'dynamic'`:

```typescript
const mergedBudget = useMemo(() => {
  const base = { ...state.activeBudget };
  for (const k of Object.keys(base)) {
    base[Number(k)] = [...base[Number(k)]];
  }
  
  // Kun i dynamisk tilstand: tilføj pipeline og fremtidige udgifter
  if (state.budgetMode === 'dynamic') {
    pipelineJobs.forEach(job => { ... });
    activeExpenses.forEach(exp => { ... });
  }
  
  return base;
}, [state.activeBudget, state.budgetMode, pipelineJobs, activeExpenses]);
```

### Ingen andre ændringer nødvendige
- `computePL`, `computeRealized` og visningskomponenter er korrekte
- Problemet er udelukkende i datamerge-steget i `Index.tsx`

| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Betinget merge af pipeline/future expenses (kun dynamisk tilstand) |

