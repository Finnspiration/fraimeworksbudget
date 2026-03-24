
Fixen skal laves ved kilden, ikke kun i pipeline-visningen.

## Hvad der faktisk er galt
Jeg har gennemgået beregningsflowet, og problemet er nu tydeligt:

- `Resultatopgørelse` bruger `computeRealized()` i `src/lib/budget-utils.ts`
- Den funktion fjerner kun moms, hvis `transaction.moms` er `U25` eller `I25`
- De importerede indbetalinger i databasen har `moms = NULL` på fx konto `1010`
- Derfor bliver de stadig regnet med bruttobeløb i resultatopgørelsen
- Den tidligere rettelse i `PipelineTab.tsx` ændrede kun visningen i én tabel og løste ikke selve PL-beregningen

Jeg kan også se, at kontoplanen i databasen pt. heller ikke har udfyldt `moms`-metadata på de relevante konti, så vi kan ikke stole på kun `tx.moms`.

## Plan
### 1. Lav én fælles moms-resolver
Opret en delt helper, som afgør effektiv moms-kode for en postering ud fra denne prioritet:

1. `tx.moms`, hvis den findes
2. kontoens `moms` fra aktiv kontoplan
3. fallback-inferens fra kontonavn/retning, fx:
   - `m/moms` + negativ indbetaling => `U25`
   - `m/moms` + positiv udgift => `I25`
   - `u/moms` => ingen moms

Det gør løsningen robust også for eksisterende data med tom `moms`.

### 2. Ret selve resultatopgørelsens beregning
Opdatér `computeRealized()` i `src/lib/budget-utils.ts`, så den bruger den nye helper i stedet for kun `tx.moms`.

Opdatér derefter `src/hooks/use-db-state.ts`, så den sender aktiv kontoplan med ind i realiseringsberegningen.

Det er dette trin, der reelt fikser tallene i resultatopgørelsen.

### 3. Brug samme logik alle steder hvor beløb vises
For at undgå flere inkonsistenser skal samme helper også bruges i:

- `src/components/budget/PipelineTab.tsx`
- `src/components/budget/OverblikTab.tsx`
- `src/components/budget/CellWithTooltip.tsx`
- `src/components/budget/SkatTab.tsx`

Så samme transaktion altid vises og beregnes ens på tværs af appen.

### 4. Ret importen, så nye posteringer gemmes korrekt fremover
Opdatér `src/components/budget/ImportTab.tsx`, så import sætter moms automatisk, når filen ikke indeholder den, baseret på konto/kontoplan.

Så vi både:
- retter eksisterende data i runtime
- og forhindrer at nye importer igen bliver forkerte

### 5. Verificering
Jeg vil validere mod de konkrete indbetalinger, der allerede ligger i data på konto `1010`, så vi sikrer at:

- resultatopgørelsen viser nettobeløb
- pipeline viser samme nettobeløb
- tooltips matcher
- momsberegningen bliver konsistent

## Tekniske detaljer
Berørte filer:

- `src/lib/budget-utils.ts`
- `src/hooks/use-db-state.ts`
- `src/components/budget/PipelineTab.tsx`
- `src/components/budget/OverblikTab.tsx`
- `src/components/budget/CellWithTooltip.tsx`
- `src/components/budget/SkatTab.tsx`
- `src/components/budget/ImportTab.tsx`

Ingen databaseændring er nødvendig for at få den nuværende visning korrekt. Løsningen bliver lavet i beregningslaget og importlaget, så eksisterende poster med tom `moms` også bliver håndteret rigtigt.