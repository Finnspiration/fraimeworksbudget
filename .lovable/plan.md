

# Auto-moms ved kontovalg + "Kopiér resten af året"

## Problem 1: Moms følger ikke med ved kontovalg
`acctMomsMap` læser `r.moms` fra PLRow, men PLRow-entries har ikke `moms` sat direkte. Den eksisterende `resolveEffectiveMoms` kan udlede moms fra kontonavnet (fx "Edb-udgifter / software" → I25 via label-inferens), men den bruges ikke i FutureExpensesTab.

## Problem 2: "Kopiér frem"-dialogen kræver manuelt antal måneder
Brugeren skal selv beregne hvor mange måneder der er tilbage af året. Der mangler en knap til "Kopiér resten af året".

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

**1. Brug `resolveEffectiveMoms` i stedet for `acctMomsMap`**

Erstat `acctMomsMap.get(v)` med `resolveEffectiveMoms(null, v, activePL)` i:
- Kontovalg ved ny række (linje 283-285)
- Kontovalg ved redigering (linje 342-344)

Import `resolveEffectiveMoms` fra `@/lib/budget-utils`.

**2. Tilføj "Kopiér resten af året"-knap i kopier-dialogen**

I copy-dialogen (linje 408-428):
- Beregn automatisk antal resterende måneder fra udgiftens dato til december
- Tilføj en knap "Resten af året (X mdr)" der sætter `copyMonths` til det beregnede antal
- Behold den manuelle input som alternativ

```typescript
const remainingMonths = copyDialog?.dato
  ? 12 - parse(copyDialog.dato, 'yyyy-MM-dd', new Date()).getMonth()
  : 0;
```

Tilføj knap: `<Button variant="outline" onClick={() => setCopyMonths(remainingMonths)}>Resten af året ({remainingMonths} mdr)</Button>`

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Brug `resolveEffectiveMoms` for auto-moms + tilføj "resten af året"-knap |

