

# Overblik-side: Budget-toggle, Top-kunder og Gældsoversigt

## 1. Budget-toggle på Overblik

OverblikTab modtager ikke `budgetMode`/`setBudgetMode` i dag. Disse props skal sendes fra Index.tsx, og en toggle (samme stil som ResultatTab) tilføjes øverst på Overblik-siden.

### Filer:
- **`src/pages/Index.tsx`** — send `budgetMode` og `setBudgetMode` som props til OverblikTab
- **`src/components/budget/OverblikTab.tsx`** — tilføj props, vis ToggleGroup øverst (Fast/Dynamisk)

## 2. Top-kunder (akkumuleret omsætning fra kassekladde + pipeline)

Ny sektion: "Største kunder" — viser kunder rangeret efter samlet værdi (realiseret + vægtet pipeline).

- **Realiseret**: Brug `txns` — match transaktioner via `faktura`-felt eller tilknyt kundenavn hvis muligt. Da kassekladden ikke har direkte kundereference, baseres dette udelukkende på pipeline-data.
- **Pipeline**: Brug `pipelineJobs` med `customer`-data (allerede joined via `PipelineJobWithCustomer`). Sumér `amount * probability/100` pr. kunde.
- Vis top 6 kunder med horizontal bar (som udgiftsposter).

### Fil:
- **`src/components/budget/OverblikTab.tsx`** — ny Card "Største kunder" med bar-chart baseret på pipeline-data grupperet pr. kunde

## 3. Gældsoversigt (Skat, Moms, Anden gæld)

Ny sektion: "Skyldige poster" — kompakt oversigt med tre rækker:

| Post | Beløb |
|---|---|
| Skyldig moms | Netto moms - betalt moms |
| Skyldig skat | Estimeret skat - betalt B-skat |
| Anden gæld | Fra `andenGeld` |
| **I alt** | Sum |

### Props fra Index.tsx:
OverblikTab skal modtage: `momsBetalt`, `bskat`, `andenGeld`, `skatPct`, `virksomhedstype`, `txns` (allerede der)

### Beregning:
- **Moms**: For hvert kvartal: salgsmoms (U25-txns) - købsmoms (I25-txns) - betalt. Sum af udestående.
- **Skat**: `projRes * skatPct/100 - sum(bskat.betalt)`
- **Anden gæld**: Direkte fra `andenGeld`

### Filer:
- **`src/pages/Index.tsx`** — send ekstra props til OverblikTab
- **`src/components/budget/OverblikTab.tsx`** — tilføj Props-interface, beregn gældsposter, ny Card "Skyldige poster"

## Opsummering af ændringer

| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Send budgetMode, setBudgetMode, momsBetalt, bskat, andenGeld, skatPct, virksomhedstype til OverblikTab |
| `src/components/budget/OverblikTab.tsx` | 1) Budget-toggle øverst 2) Top-kunder kort 3) Gældsoversigt kort |

