

# Fix: Vis indbetalinger i pipeline uden moms

## Problem
Indbetalinger fra kassekladden vises i pipeline-tabellen med bruttobeløb (inkl. moms), men bør vises ekskl. moms for at matche resultatopgørelsen. Manuelt indtastede pipeline-jobs er allerede korrekte (indtastet uden moms).

## Løsning

### Fil: `src/components/budget/PipelineTab.tsx`

I sektionen der viser revenue-transaktioner (ca. linje 229-233):

- Beregn nettobeløb for hver transaktion: hvis `txn.moms === 'U25'`, divider `Math.abs(txn.belob)` med 1.25
- Brug nettobeløbet i stedet for `Math.abs(txn.belob)` i både "Beløb"- og "Vægtet"-kolonnen

Før:
```tsx
fmt(Math.abs(txn.belob))  // inkl. moms
```

Efter:
```tsx
const netAmount = txn.moms === 'U25' ? Math.abs(txn.belob) / 1.25 : Math.abs(txn.belob);
fmt(netAmount)  // ekskl. moms
```

Samme mønster som allerede bruges i `OverblikTab.tsx` linje 126.

### Ingen andre ændringer nødvendige
- Resultatopgørelsen bruger allerede `netBelob()` i `computeRealized()` — korrekt
- OverblikTab bruger allerede ex-moms beregning — korrekt
- Pipeline-jobs (manuelt indtastet) er allerede uden moms — korrekt

| Fil | Ændring |
|---|---|
| `src/components/budget/PipelineTab.tsx` | Vis indbetalinger ekskl. moms |

