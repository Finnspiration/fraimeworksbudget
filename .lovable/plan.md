

# Fix: Skyldige poster opdateres ikke korrekt

## Problemer identificeret

1. **Proj. årsresultat bruger simpel ekstrapolering** (linje 64): `(realized / nReal) * 12` — ignorerer helt budgetdata. Bør bruge realiseret + budget for resterende måneder.

2. **Estimeret skat beregnes på negative resultater** (linje 166): `projYear * skatPct / 100` kan give negativ skat. Bør være `Math.max(0, projYear) * skatPct / 100`.

3. **Moms kun baseret på realiserede transaktioner** (linje 153-158): Fremtidige kvartaler viser 0, selvom der er budgetdata. Bør inkludere budgetteret moms (som allerede beregnes i SkatTab).

## Ændringer i `src/components/budget/OverblikTab.tsx`

### 1. Fix `projYear` — brug realiseret + budget
```typescript
// Fra:
const projYear = nReal > 0 && resRow ? (sumArr(resRow.r, 0, nReal - 1) / nReal) * 12 : 0;

// Til:
const projYear = resRow ? sumArr(resRow.r, 0, nReal - 1) + sumArr(resRow.b, nReal, 11) : 0;
```

### 2. Fix estimeret skat — ingen skat på tab
```typescript
const estimatedTax = Math.max(0, projYear) * skatPct / 100;
```

### 3. Fix moms — inkludér budgetteret moms for fremtidige måneder
Beregn budgetteret salgsmoms (U25-konti) og købsmoms (I25-konti) fra `pl`-data for måneder ≥ nReal, samme logik som SkatTab. Tilføj til kvartalernes netto-moms så fremtidige kvartaler ikke er 0.

## Fil

| Fil | Ændring |
|---|---|
| `src/components/budget/OverblikTab.tsx` | Fix projYear, skat-beregning, og moms-beregning i debtData |

