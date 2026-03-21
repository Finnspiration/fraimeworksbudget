

# Fix: Budget-toggle og beregninger i Resultatopgørelse

## Problem

`Index.tsx` linje 21 bruger altid `state.budget` (det faste budget) til at bygge `mergedBudget` — uanset om brugeren har valgt "Dynamisk budget". Det dynamiske budget fra `useBudgetState` (som beregnes korrekt i hooket) bliver aldrig brugt i Index.

Derfor ændrer toggle mellem fast/dynamisk budget ikke tallene.

## Løsning

### `use-budget-state.ts`
- Eksponér `activeBudget` (som allerede beregnes internt som `budgetMode === 'dynamic' ? dynamicBudget : budget`) i return-objektet

### `Index.tsx`  
- Brug `state.activeBudget` i stedet for `state.budget` i `mergedBudget`-beregningen (linje 21)
- Tilføj `state.budgetMode` som dependency (allerede indirekte via `activeBudget`)

## Ændrede filer
- `src/hooks/use-budget-state.ts` — tilføj `activeBudget` til return
- `src/pages/Index.tsx` — erstat `state.budget` med `state.activeBudget` i mergedBudget

