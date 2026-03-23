

# Fremtidige udgifter: Un-match, datovælger og kopiering

## 1. Un-match funktion

### Hook: `src/hooks/use-future-expenses.ts`
- Tilføj `unmatchExpense(id)` der sætter `matched = false` og `matched_txn_id = null`

### UI: `src/components/budget/FutureExpensesTab.tsx`
- For matchede rækker: vis en "Fortryd match" knap (Undo-ikon) i actions-kolonnen i stedet for ingenting
- Klik kalder `unmatchExpense`, viser toast "Match fortrudt"

## 2. Datovælger (Calendar popover)

Erstat `<Input type="date">` med Shadcn Calendar+Popover — både i "tilføj ny"-formularen og i inline-redigering.

### Fil: `src/components/budget/FutureExpensesTab.tsx`
- Import `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent`, `format` fra date-fns
- Ny-række dato: Popover med Calendar, viser valgt dato formateret
- Edit-række dato: Samme popover-mønster
- Husk `pointer-events-auto` på Calendar

## 3. Kopiér udgift X måneder frem

### UI: `src/components/budget/FutureExpensesTab.tsx`
- For aktive rækker: tilføj en "Kopiér frem" knap (Copy-ikon)
- Klik åbner en lille dialog/popover med et talfeld "Antal måneder frem" (default 1)
- Ved bekræftelse: opretter N kopier af udgiften, hvor hver kopi har datoen forskudt +1, +2, ... +N måneder
- Bruger `addExpense` for hver kopi
- Toast: "Oprettet X kopier"

### Logik for datoforskydning:
```typescript
const copyForward = async (exp: FutureExpense, months: number) => {
  for (let i = 1; i <= months; i++) {
    const newDate = new Date(exp.dato);
    newDate.setMonth(newDate.getMonth() + i);
    await addExpense({
      ...exp, // tekst, belob, konto, moms, etc.
      dato: newDate.toISOString().split('T')[0],
    });
  }
};
```

## Filer der ændres

| Fil | Ændring |
|---|---|
| `src/hooks/use-future-expenses.ts` | Tilføj `unmatchExpense` funktion |
| `src/components/budget/FutureExpensesTab.tsx` | Un-match knap, Calendar datovælger, kopiér-frem dialog |

