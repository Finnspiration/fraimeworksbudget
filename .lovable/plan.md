

# Fast budget med Fremtidige Udgifter + Rolling forecast kun fra realiseret

## Oversigt

To ændringer:

1. **Fast budget**: Celler viser Fremtidige Udgifter (summeret per konto+måned) med prioritet over manuelt indtastede beløb. Visuelt markeret med dashed ramme når værdien kommer fra Fremtidige Udgifter.
2. **Rolling forecast (dynamisk)**: Fjern future expenses fra merge — kun pipeline + realiserede tal.

## Ændringer

### 1. `src/pages/Index.tsx`

- **Beregn `futureExpensesBudget`**: Nyt `useMemo` der bygger `Record<number, number[]>` fra `activeExpenses` (sum per konto+måned). Sendes som prop til `ResultatTab`.
- **Fjern future expenses fra dynamic merge**: Slet blokken (linje 46-53) der tilføjer `activeExpenses` i dynamic mode.
- **Tilføj future expenses i fixed mode**: I fixed mode, overlay `futureExpensesBudget` oven på `base` budget, så `computePL` får de korrekte tal.

### 2. `src/components/budget/ResultatTab.tsx`

- **Ny prop**: `futureExpensesBudget: Record<number, number[]>`
- **Ny `FixedBudgetCell` komponent** til brug i fast tilstand:
  - Tjek `futureExpensesBudget[konto][month]` — hvis ≠ 0: vis beløbet readonly med `border border-dashed border-amber-500/60 rounded bg-amber-50/30` 
  - Ellers: vis `EditableBudgetCell` som nu
- Erstat den eksisterende `EditableBudgetCell`-rendering i fast tilstand med `FixedBudgetCell`

### Visuel logik per celle (fast budget)

```text
futureExp[konto][month] ≠ 0?
  → Readonly celle med dashed amber ramme
  → Tooltip: "Fra Fremtidige Udgifter"
Ellers manuelBudget ≠ 0?
  → Redigerbar celle (som nu)
Ellers:
  → Vis '–'
```

### Filer

| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Beregn futureExpensesBudget, fjern future exp fra dynamic, merge i fixed mode |
| `src/components/budget/ResultatTab.tsx` | Ny prop + FixedBudgetCell komponent |

