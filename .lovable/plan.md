

# Fix: Kontoplan-import og beregningsfejl

## Identificerede problemer

### Problem 1: Manglende konti i kontoplanen
Transaktioner med konto 1950, 6135 og 6920 findes i kassekladden, men der er ingen `acct`-rækker for disse i kontoplanen. Kontoplanimportens type=1 logik fungerer korrekt — problemet er at Excel-filen ikke indeholdt disse som type 1-konti, eller de blev filtreret fra. **Resultat**: Beløbene tæller ikke med i resultatopgørelsen.

### Problem 2: `res`-rækker (type 6) summer ALLE tidligere totaler — dobbelt-tælling
Når en type=6 række importeres, oprettes en `res`-række der summer **alle** hidtidige `totalIds`. Det inkluderer:
- Gruppetotaler: `t1099` (Omsætning i alt), `t1399` (Direkte omk. i alt), `t2299` (Lønninger i alt), etc.
- Kumulative totaler: `t2000` (Dækningsbidrag = range:1000-2000), `t3800` (Resultat før afskr. = range:1000-3800), `t4990` (PERIODENS RESULTAT = range:1000-4990)

Når en `res`-række summer alle disse, tælles f.eks. omsætningen mange gange — én gang via `t1099`, én gang via `t2000`, én gang via `t3800`, osv. **Det er årsagen til de skæve tal.**

### Problem 3: `final`-rækken summer `res`-rækker der allerede overlapper
`PERIODENS RESULTAT` (final) = `r6112 + r6199 + r8999` — tre res-rækker der hver allerede indeholder overlappende totaler.

## Løsning

### 1. Fix type=6 import-logik (`ImportTab.tsx`, linje 254-257)

Type 6 i dansk kontoplan er et "SumInterval" — den summerer et interval, ligesom type 3. Den skal IKKE summere alle foregående totaler. Fix:

- Hvis `sumfra` er udfyldt: brug `range:${sumfraNum}-${nr}` (ligesom type 3)
- Hvis `sumfra` er tom: brug `range:${lastTotalNr+1}-${nr}` (fra efter sidste total til nuværende)
- Ændr type fra `res` til `total` — type 6 er en total, ikke et resultat

### 2. Fix auto-genereret `final`-række (linje 261-268)

Erstat logikken så `final`-rækken bruger den SIDSTE kumulative total (typisk `t4990` for P&L) i stedet for at summere alle res/total-rækker.

Bedre: Brug `range:1000-4990` for PERIODENS RESULTAT — en enkelt range der dækker hele P&L.

### 3. Fix eksisterende data i databasen

Ret de forkerte `res`-rækker i `chart_of_accounts`:
- "Periodens resultat" (r6112): Bør bruge `range:1000-4990` eller kun `id:t4990` (da t4990 allerede er range:1000-4990)
- "EGENKAPITAL I ALT" (r6199): Bør bruge korrekt interval
- "PASSIVER I ALT" (r8999): Bør bruge korrekt interval
- "PERIODENS RESULTAT" (final): Bør kun pege på den rigtige resultat-total

### 4. Tilføj manglende konti

Tilføj `acct`-rækker for konto 1950, 6135, 6920 i den korrekte sektion af kontoplanen — eller vis en advarsel til brugeren om at der er transaktioner med kontonumre der ikke findes i kontoplanen.

## Filer der ændres

| Fil | Ændring |
|---|---|
| `src/components/budget/ImportTab.tsx` | Fix type=6 logik: brug range-formel i stedet for at summere alle totalIds. Fix final-generering. |
| Database (data update) | Ret de forkerte sum_formula-værdier for res- og final-rækker |

## Teknisk detalje: Ny type=6 logik

```typescript
} else if (type === 6) {
  const id = `t${nr}`;
  totalIds.push(id);
  const sumfraNum = Number(sumfra);
  const formula = sumfraNum > 0 
    ? `range:${sumfraNum}-${nr}` 
    : `grp:${currentGrp}`;
  plRows.push({ t: 'total', nr, lbl: navn, id, sum: formula });
  addMeta();
}
```

Og for `final`-generering: find den kumulative P&L total (typisk den med det højeste nr under 5000) og brug dens id.

