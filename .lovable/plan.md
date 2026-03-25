

# Budget toggle konsistens + estimeret skat/moms i Skat & Moms

## Ændringer

### 1. Overblik: Ret budget toggle til Switch-stil
**`src/components/budget/OverblikTab.tsx`**
- Erstat `ToggleGroup` med `Switch` + `Badge` (som i ResultatTab)
- Samme layout: `"Fast/Dynamisk budget"` label + Switch + Badge "Rolling forecast"

### 2. Skat & Moms: Tilføj budget toggle + budgetterede tal
**`src/components/budget/SkatTab.tsx`**
- Tilføj `budgetMode` og `setBudgetMode` til Props
- Tilføj Switch-baseret budget toggle øverst (samme stil som ResultatTab)
- **Momsafregning**: Tilføj kolonner for "Budget salgsmoms" og "Budget købsmoms" beregnet fra `pl`-data (omsætning × 25% for salg, udgifter × 25% for køb) for måneder uden realiserede data (≥ nReal)
- **Estimeret skat pr. måned**: Brug budgettal for fremtidige måneder i stedet for gennemsnit. For `i < nReal`: brug `resRow.r[i]`. For `i >= nReal`: brug `resRow.b[i]`. Beregn skat korrekt (kun på positiv akkumuleret resultat) så tallene vises i stedet for "–"
- Estimeret skat vises nu korrekt: akkumuleret resultat × skatpct, og kun skat på positiv del

### 3. Index.tsx: Send budgetMode/setBudgetMode til SkatTab
**`src/pages/Index.tsx`**
- Tilføj `budgetMode={state.budgetMode} setBudgetMode={state.setBudgetMode}` til SkatTab props

## Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/OverblikTab.tsx` | Erstat ToggleGroup med Switch+Badge |
| `src/components/budget/SkatTab.tsx` | Tilføj budget toggle, brug budget-resultat for fremtidige måneder, vis estimeret skat korrekt |
| `src/pages/Index.tsx` | Send budgetMode/setBudgetMode til SkatTab |

