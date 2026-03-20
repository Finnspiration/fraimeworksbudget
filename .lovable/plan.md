

# Fix dashboard: ukorrekte tal for omsætning og udgifter

## Identificerede problemer

### Problem 1: YTD Omsætning viser "– kr"
OverblikTab slår op i `pl['oms']` for at finde omsætningen. I den hardkodede PL har omsætningstotalen `id: 'oms'`. Men når en custom kontoplan importeres, genereres ID'er automatisk som `t1099`, `t1300` osv. — der er intet `oms`-id. Derfor returnerer `pl['oms']` `undefined`, og `fmt(0)` giver '–'.

### Problem 2: Bar chart viser ingen omsætning
Samme årsag som problem 1 — `omsRow` er undefined med custom kontoplan.

### Problem 3: Udgifter misser direkte omkostninger
Udgiftsberegningen bruger `row.nr > 1999` hardkodet, hvilket udelukker direkte omkostninger i 1xxx-området (f.eks. konto 1305 "Finders fee", 1310 "Direkte omkostninger m/moms"). Bruger ønsker alle omkostninger inkluderet.

### Problem 4: Udgifter virker ikke med custom kontoplan
Med en importeret kontoplan kan kontonumre have helt andre intervaller — `> 1999` er meningsløst.

## Løsning

### Ændring i `OverblikTab.tsx`

Udled omsætning og udgifter dynamisk fra PL-strukturen i stedet for hardkodede ID'er og kontonummer-intervaller:

1. **Find omsætning**: Find den første `total`-linje i `activePL` — det er omsætningstotalen. Brug dens `id` til at slå op i `pl`.

2. **Find udgifter**: Sum alle `acct`-linjer der IKKE er i samme gruppe som den første `total` (dvs. alle konti undtagen omsætningen). Eller beregn det som `omsætning - resultat` (da resultat = omsætning - alle omkostninger).

3. **Udgiftsposter YTD**: Erstat `nr > 1999` med "alle acct-rækker der ikke er i omsætningsgruppen".

**Konkret:**
```
// Find første total = omsætning
const firstTotal = activePL.find(r => r.t === 'total');
const omsId = firstTotal?.id;
const omsRow = omsId ? pl[omsId] : undefined;

// Find omsætnings-gruppen
const omsGrp = firstTotal?.sum?.startsWith('grp:') 
  ? firstTotal.sum.split('+').map(s => s.replace('grp:','').trim())
  : [];

// Udgifter = alle acct-rækker IKKE i omsætnings-gruppen
const expenseAccts = activePL.filter(r => 
  r.t === 'acct' && !omsGrp.includes(r.grp!)
);
```

### Filer der ændres
- **`src/components/budget/OverblikTab.tsx`** — al logik for omsætning/udgifter refaktoreres

### Ingen ændringer i
- `budget-utils.ts` — beregningerne er korrekte
- `use-budget-state.ts` — state-håndtering er korrekt
- `ImportTab.tsx` — kontoplan-import er korrekt

