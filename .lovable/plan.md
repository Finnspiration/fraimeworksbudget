# Fix: Fremtidige udgifter vises som positive beløb i budget

## Problem
I screenshot ses fx parkering (konto 3150) i april med fremtidig udgift `600` (positiv, grøn) i den stiplede ramme — burde være `-600` (negativ, rød), ligesom de manuelt indtastede budgetter (`-750`).

## Årsag
`futureExpensesBudget` i `src/pages/Index.tsx` (linje 31-41) gemmer `exp.belob` direkte fra databasen, som er positivt (brugere indtaster fremtidige udgifter som positive tal i `FutureExpensesTab`).

`mergedBudget` (linje 64-72) negerer korrekt værdien for selve PL-beregningen (`base[k][i] = -val`), men det map der sendes til `FixedBudgetCell` til visning er stadig positivt. Cellen viser derfor det rå positive beløb.

## Fix
I `src/pages/Index.tsx`, lad `futureExpensesBudget` indeholde værdien med korrekt fortegn (negativ for udgiftskonti, ≥1300), så cellen viser `-600` direkte og forbliver konsistent med `mergedBudget`-beregningen.

```ts
const futureExpensesBudget = useMemo(() => {
  const map: Record<number, number[]> = {};
  activeExpenses.forEach(exp => {
    const d = new Date(exp.dato);
    if (isNaN(d.getTime()) || d.getFullYear() !== YEAR) return;
    const month = d.getMonth();
    if (!map[exp.konto]) map[exp.konto] = new Array(12).fill(0);
    // Udgiftskonti gemmes som negative (samme konvention som manuelt budget)
    const signed = exp.konto >= 1300 ? -Math.abs(exp.belob) : exp.belob;
    map[exp.konto][month] += signed;
  });
  return map;
}, [activeExpenses]);
```

Og opdatér `mergedBudget` (linje 67-70) så den ikke negerer igen — brug `val` direkte:
```ts
months.forEach((val, i) => {
  if (val !== 0) {
    base[k][i] = val;
  }
});
```

## Resultat
- Parkering april viser `-600` (rød/dimmed) i stedet for `600` (grøn)
- Konsistent med manuelt indtastede budgetposter (`-750`)
- PL-totaler uændrede (samme negative værdier ender i beregningen)

## Fil
| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Sign-konvertér `futureExpensesBudget`; fjern dobbelt-negering i `mergedBudget` |
