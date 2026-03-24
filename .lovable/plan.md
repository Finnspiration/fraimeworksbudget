

# Fix: Fremtidige udgifter — matching og fortegn

## Problem 1: Forkert matching
Matching-logikken i `use-future-expenses.ts` bruger et 30-dages vindue, som er for bredt. En Dropbox-udgift på 2025-04-04 kan matche mod en transaktion fra en helt anden måned. Derudover tjekker den ikke, om transaktionen faktisk ligger **før eller på** udgiftsdatoen — den matcher bare inden for ±30 dage.

**Fix:** Stram matchingen:
- Reducer vinduet til ±7 dage
- Kræv at transaktionsdatoen er ≤ udgiftsdatoen (transaktionen skal allerede være sket)
- Tilføj tjek på `tekst`-feltet hvis muligt (fuzzy match på beskrivelse)

## Problem 2: Fremtidige udgifter har forkert fortegn i resultatopgørelsen
I `Index.tsx` linje 52 tilføjes fremtidige udgifter som `+= exp.belob`. Men `computeRealized()` negerer alle beløb (`r[key] = ... - net`), så kassekladde-udgifter ender som negative tal i PL.

Fremtidige udgifter skal følge samme konvention: de skal negeres når de lægges ind i budgettet, da de repræsenterer udgifter (positive beløb i input → negative i PL).

**Fix i `src/pages/Index.tsx` linje 52:**
```typescript
// Før:
base[exp.konto][month] += exp.belob;

// Efter:
base[exp.konto][month] -= exp.belob;
```

Dette matcher præcis hvad `computeRealized` gør med kassekladde-posteringer.

## Berørte filer

| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Negér fremtidige udgifter ved merge ind i budget |
| `src/hooks/use-future-expenses.ts` | Stram matching: ±7 dage, kræv txn-dato ≤ udgiftsdato |

