

# Fix: Budget-fortegn for udgiftskonti i fast budget

## Problem
Konti 2216 ("Lønninger - Charlotte") og 2217 ("Lønninger - Finn") har budgetværdier på **+25.000** og **+5.000** pr. måned i databasen. Men det er udgiftskonti — de burde være **negative** (som fx konto 2210 der korrekt er -25.000).

Når `computePL` summerer alle lønkonti, bliver de positive værdier lagt **til** resultatet i stedet for trukket **fra**. Det giver det oppustede resultat på 772.904 i fast budget.

I dynamisk budget er der ingen transaktioner på disse konti, så dynamic budget beregner 0 — derfor ser dynamisk korrekt ud (74.933).

## Grundårsag
`updateBudget` i `ResultatTab.tsx` (linje 87-93) gemmer brugerens input direkte uden fortegnskorrektion. Brugeren skriver naturligt "25000" for en lønudgift, men systemet kræver "-25000".

## Løsning

### 1. Auto-neger udgiftskonti i `updateBudget`
**Fil:** `src/components/budget/ResultatTab.tsx`

Tilføj logik i `updateBudget` der tjekker om kontoen er en udgiftskonto (dvs. ikke i en omsætningsgruppe). Hvis brugeren indtaster et positivt tal for en udgiftskonto, gem det automatisk som negativt.

Konvention: omsætningskonti er dem med `grp` svarende til den gruppe der bruges i den første `total`-række (typisk 'oms' eller 'grp2'). Alle andre `acct`-rækker er udgifter.

Konkret: find kontoens PLRow, tjek om dens `grp` matcher omsætningsgruppen. Hvis ikke, og værdien er positiv, neger den.

### 2. Vis absolutte værdier i redigeringscellen
**Fil:** `src/components/budget/ResultatTab.tsx`

I `EditableBudgetCell`, vis `Math.abs(value)` for udgiftskonti (men gem som negativt). Tilføj en lille visuel indikator (fx rød farve eller minus-ikon) så brugeren kan se at det er en udgift.

### 3. Ret eksisterende forkerte data i databasen
**Migration:** Opdatér konto 2216 og 2217 budget-entries til negative værdier.

```sql
UPDATE budget_entries 
SET amount = -ABS(amount) 
WHERE konto IN (2216, 2217) AND amount > 0;
```

### 4. Identificer omsætningsgruppen dynamisk
For at vide hvilke konti der er "omsætning" (positive) vs "udgifter" (negative), find den første `total`-række i `activePL` og dens `sum`-formel. Konti i den refererede gruppe er omsætning, alle andre er udgifter.

Alternativt, enklere heuristik: konti med `nr < 1300` er omsætning, resten er udgifter. Dette matcher kontoplanens nummersystem.

## Berørte filer

| Fil | Ændring |
|---|---|
| `src/components/budget/ResultatTab.tsx` | Auto-neger udgiftskonti, vis absolutte værdier |
| Database migration | Ret eksisterende positive udgiftsbudgetter |

