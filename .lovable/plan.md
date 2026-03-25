

# Fix: Største udgiftsposter viser indtægtskonti

## Problem
`expenseAcctRows` filtrerer konti med `!omsGroups.includes(r.grp!)`. `omsGroups` udtrækkes fra den første `total`-rækkes `sum`-formel (fx `grp:oms`). Men når brugeren har importeret en custom kontoplan, kan grupperne hedde noget andet eller mangle — så konto 1010 (omsætning) ikke filtreres fra.

## Løsning

### `src/components/budget/OverblikTab.tsx`
Erstat den nuværende `expenseAcctRows`-logik med en mere robust tilgang: saml **alle** grupper der hører til omsætning ved at traversere kontoplanen og finde alle `acct`-rækker der ligger **før** den første `total`- eller `res`-række. Disse er per definition indtægtskonti.

```typescript
// Ny logik: find alle konto-numre der ligger før første total/res-række
const revenueNrs = useMemo(() => {
  const nrs = new Set<number>();
  for (const r of activePL) {
    if (r.t === 'total' || r.t === 'res') break; // stop ved første summering
    if (r.t === 'acct' && r.nr != null) nrs.add(r.nr);
  }
  return nrs;
}, [activePL]);

const expenseAcctRows = useMemo(() =>
  activePL.filter(r => r.t === 'acct' && r.nr != null && !revenueNrs.has(r.nr!))
, [activePL, revenueNrs]);
```

Dette virker uanset gruppenavne og custom kontoplaner, fordi det bruger kontoplanens struktur (rækkefølge) til at identificere omsætningskonti.

## Omfang
Én fil ændres: `src/components/budget/OverblikTab.tsx` — ny `revenueNrs` memo + opdateret `expenseAcctRows` filter.

