

# Estimeret momsafregning i Skat & Moms

## Problem
Momsafregning-tabellen viser kun realiseret moms fra kassekladden. For kvartaler med fremtidige måneder (≥ nReal) vises 0, selvom der er budgetterede indtægter og udgifter.

## Løsning

### `src/components/budget/SkatTab.tsx`

**Tilføj budgetteret moms-beregning:**

1. Beregn budgetteret salgsmoms pr. måned: find alle `acct`-rækker i `activePL` med `grp:'oms'` og moms (U25), summér deres budgetværdi × 25% for fremtidige måneder
2. Beregn budgetteret købsmoms pr. måned: find alle expense `acct`-rækker med I25-moms, summér budgetværdi × 25%
3. For simplere tilgang: brug `pl['oms'].b[i]` (allerede netto) × 0.25 som budget salgsmoms, og summér expense-konti med moms × 0.25 som budget købsmoms

**Opdatér `computeSalgsmoms` og `computeKobsmoms`:**
- Tilføj nye funktioner `computeBudgetSalgsmoms(months)` og `computeBudgetKobsmoms(months)` der bruger PL-budgetdata
- For hvert kvartal: vis realiseret moms for måneder < nReal, og budgetteret moms for måneder ≥ nReal
- Tilføj kolonne "heraf estimeret" eller vis samlet (realiseret + estimeret) med italic styling for estimerede dele

**Tilføj nyt "Estimeret moms pr. måned" kort** (tilsvarende "Estimeret skat pr. måned"):
- Tabel med kolonner: Måned, Salgsmoms, Købsmoms, Netto moms, Akkumuleret
- For `i < nReal`: brug realiseret moms fra transaktioner
- For `i >= nReal`: brug budgetteret moms fra PL-data
- Fremtidige måneder vises i italic/muted som i skat-tabellen
- Totalrække med årsestimat

**Momsafregning-tabellen opdateres:**
- Kvartals-tallene inkluderer nu budgetterede beløb for fremtidige måneder
- Estimerede dele markeres visuelt (italic/muted) for at skelne fra realiseret

## Fil

| Fil | Ændring |
|---|---|
| `src/components/budget/SkatTab.tsx` | Tilføj budget-moms beregninger + nyt "Estimeret moms pr. måned" kort + opdatér momsafregning med estimater |

