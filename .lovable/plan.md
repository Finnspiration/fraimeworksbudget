

# Budget Toggle: Fast vs. Dynamisk Budget

## Koncept
Tilføj en toggle i Resultatopgørelsen (og Overblik) der skifter mellem:

- **Fast budget**: De manuelt indtastede budgettal (som nu)
- **Dynamisk budget**: Auto-beregnet fra realiserede tal — tager gennemsnit af realiserede måneder og projicerer det ud på de resterende måneder

## Beregning af dynamisk budget
For hver konto:
- Måneder 0..nReal-1: brug det realiserede tal som "budget" (altså budget = actual)
- Måneder nReal..11: brug gennemsnit af realiserede måneder (`sumArr(realized, 0, nReal-1) / nReal`)

Dette giver et "rolling forecast" baseret på faktisk performance.

## Ændringer

### 1. Ny utility-funktion (`budget-utils.ts`)
- `computeDynamicBudget(pl, nReal)` → returnerer `Record<number, number[]>` med dynamisk budget per konto
- For ikke-realiserede måneder: gennemsnit af realiserede

### 2. Toggle i `ResultatTab`
- Tilføj en toggle/switch ved siden af "Realiserede måneder" med label "Fast budget / Dynamisk budget"
- Når dynamisk er valgt: beregn `pl` med dynamiske budgettal via `computePL(realized, dynamicBudget)`
- Budget-celler er kun redigerbare i "Fast budget"-mode
- Visuel indikator (badge/farve) for hvilken mode der er aktiv

### 3. Opdater `useBudgetState` og `Index.tsx`
- Tilføj `budgetMode` state (`'fixed' | 'dynamic'`) med localStorage-persistering
- Pass `budgetMode` + `setBudgetMode` til ResultatTab og OverblikTab
- Beregn alternativ `pl` baseret på mode og send den rigtige videre

### 4. Opdater `OverblikTab`
- KPI-kort og grafer bruger den aktive budget-mode's tal
- Evt. lille badge der viser hvilken budget-mode der er aktiv

