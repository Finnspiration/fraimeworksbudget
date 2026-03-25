

# Fix: Konto 1010 fejlagtigt markeret som "Udgiftskonto"

## Problem
`revenueAccounts` i ResultatTab filtrerer på `grp === 'oms'`, men når en custom kontoplan er importeret, hedder grupperne `grp1`, `grp2`, osv. — aldrig `'oms'`. Derfor bliver **alle** konti (inkl. 1010 Salg af varer/ydelser) behandlet som udgiftskonti, og tooltippet viser forkert "Udgiftskonto – gemmes som negativt".

Samme problem findes i OverblikTab (brugt til "Største udgiftsposter"-filteret, allerede delvist fixet).

## Løsning

### `src/components/budget/ResultatTab.tsx`
Erstat `grp === 'oms'`-filteret med strukturel identifikation: alle `acct`-rækker der optræder **før** den første `total`-række i kontoplanen er omsætningskonti:

```typescript
const revenueAccounts = useMemo(() => {
  const revSet = new Set<number>();
  for (const row of activePL) {
    if (row.t === 'total') break; // Stop ved første total = "Omsætning i alt"
    if (row.t === 'acct' && row.nr) revSet.add(row.nr);
  }
  return revSet;
}, [activePL]);
```

Dette er samme tilgang som allerede er brugt i OverblikTab efter det tidligere fix.

### Tooltip-tekst
Opdatér også tooltippet til at vise korrekt tekst for indtægtskonti:
- Indtægtskonto: `"Indtægtskonto – klik for at redigere budget"`
- Udgiftskonto: `"Udgiftskonto – gemmes som negativt"`

## Omfang
Én fil ændres: `src/components/budget/ResultatTab.tsx` — 3 linjer i `revenueAccounts` memo.

