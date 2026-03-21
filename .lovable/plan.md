

# Fix Pipeline: Redigering, Kontonumre og Integration med Resultatopgørelse

## Tre problemer

### 1. Kan ikke redigere pipeline-jobs
Tabellen viser kun data og en status-dropdown. Der er ingen mulighed for at redigere beskrivelse, beløb, sandsynlighed, dato eller konto på eksisterende jobs.

**Løsning:** Gør celler i pipeline-tabellen klikbare for inline-redigering (ligesom kassekladden), eller tilføj en "Rediger"-knap der åbner en dialog med alle felter udfyldt.

### 2. Konto-dropdown er tom
Linje 56: `activePL.filter(r => r.t === 'acct' && r.grp === 'oms')` — med en custom kontoplan kan omsætningsgruppen hedde noget andet end `'oms'`. Dropdownen viser derfor ingen konti.

**Løsning:** Vis ALLE `acct`-rækker fra `activePL` i konto-dropdown (ikke kun `grp === 'oms'`), grupperet efter sektion. Brugeren vælger selv den relevante konto.

### 3. Pipeline-indtægter vises ikke i resultatopgørelsen
Pipeline-jobs med vægtet beløb integreres ikke i budget-beregningen. `computePL` kender ikke til pipeline-data.

**Løsning:** I `use-budget-state.ts` (eller `Index.tsx`), merge pipeline-jobs ind i budgettet: for hvert aktivt job, tilføj `amount × probability/100` til `budget[konto][måned]` baseret på `expected_payment_date`. Denne merged budget sendes til `computePL`, så pipeline-forecast automatisk vises i resultatopgørelsen.

## Ændringer per fil

### `src/components/budget/PipelineTab.tsx`
- Tilføj edit-dialog: klik på en job-række åbner en dialog med alle felter (kunde, beskrivelse, beløb, sandsynlighed, dato, status, konto) udfyldt med eksisterende værdier
- Ændr konto-filter fra `grp === 'oms'` til alle `acct`-rækker
- Tilføj en Pencil/Edit-knap ved siden af slet-knappen

### `src/hooks/use-budget-state.ts` eller `src/pages/Index.tsx`
- Hent pipeline-jobs (allerede hentet i Index)
- Beregn `pipelineBudget`: for hvert job med status !== 'tabt', find måneden fra `expected_payment_date`, tilføj `amount * probability / 100` til `budget[job.konto][month]`
- Merge med eksisterende budget og send til `computePL`
- Dette gør at pipeline-beløb automatisk vises i resultatopgørelsen under den korrekte konto

### Teknisk detalje: Budget-merge
```
pipelineJobs.forEach(job => {
  if (job.status === 'tabt') return;
  const month = new Date(job.expected_payment_date).getMonth();
  const weighted = job.amount * job.probability / 100;
  mergedBudget[job.konto][month] += weighted;
});
```

