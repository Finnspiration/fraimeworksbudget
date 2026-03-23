

# Fix: Manglende konti ved kontoplan-import

## Problem

Kontoplan-importen håndterer kun type 1, 3, 4, 5, 6 og springer type 2 over. Rækker med **type 0** (tom type-kolonne eller eksplicit 0) droppes stille — de falder gennem alle if/else-grene uden at blive importeret. 

Konto 1950 "Mellemregning med andre banker" har sandsynligvis type 0 (eller blank) i Excel-filen, og bliver derfor aldrig oprettet som `acct`-række.

## Løsning

### 1. Behandl type 0 som driftskonto (`ImportTab.tsx`, linje 244)

Rækker med `type === 0` og et gyldigt `nr > 0` skal behandles som type 1 (driftskonto):

```typescript
// Ændr: } else if (type === 1) {
// Til:
} else if (type === 1 || (type === 0 && nr > 0)) {
```

Dette fanger konti hvor type-kolonnen er tom eller 0, men som har et gyldigt kontonummer.

### 2. Vis advarsel om manglende konti efter kassekladde-import

Efter import af kassekladde: find kontonumre i transaktionerne som ikke findes i den aktive kontoplan, og vis en advarsel med liste over manglende konti. Brugeren kan så genimportere kontoplanen.

### 3. Ret eksisterende data i databasen (migration)

Opdatér de tre placeholder-rækker der blev indsat med forkerte navne:

| Nr | Nuværende label | Korrekt label |
|---|---|---|
| 1950 | "Konto 1950" | "Mellemregning med andre banker" |
| 6135 | "Konto 6135" | (skal slås op — eller brugeren genimporterer) |
| 6920 | "Konto 6920" | (skal slås op — eller brugeren genimporterer) |

Da vi ikke kender de korrekte navne for 6135 og 6920, sætter vi en generisk besked og opfordrer brugeren til at genimportere kontoplanen.

### Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/ImportTab.tsx` | Tilføj `type === 0 && nr > 0` til acct-betingelsen. Tilføj advarsel om manglende konti efter kassekladde-import. |
| Database migration | Ret label for konto 1950 til "Mellemregning med andre banker" |

