

# Virksomhedstype: Personlig vs. Selskab

## Koncept
Tilføj en `virksomhedstype`-indstilling (`'personlig' | 'selskab'`) som styrer:
- **Overskrift**: "B-skat" (personlig) vs. "Aconto skat" (selskab)
- **Antal rater**: 10 rater (personlig) vs. 2 rater (selskab, marts + november)
- **Standard skattesats**: 22% for selskab, uændret for personlig

## Ændringer

### 1. State i `use-budget-state.ts`
- Ny state: `virksomhedstype` med type `'personlig' | 'selskab'`, default `'personlig'`, persisteret i localStorage

### 2. Selskabs-rater i `budget-constants.ts`
- Tilføj `INIT_BSKAT_SELSKAB` med 2 rater (20. marts og 20. november)

### 3. Vælger i `SkatTab.tsx`
- Tilføj en RadioGroup/ToggleGroup øverst: "Personlig virksomhed" / "Selskab (ApS/AS)"
- Overskriften på B-skat Card ændres dynamisk: "B-skat {YEAR}" vs. "Aconto skat {YEAR}"
- Når typen skiftes, nulstilles bskat-raterne til den relevante standard (10 eller 2 rater)

### 4. Props
- Pass `virksomhedstype` og `setVirksomhedstype` fra Index → SkatTab

