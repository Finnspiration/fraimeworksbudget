

# Månedlig skatteestimering + Fix dashboard omsætning

## To opgaver

### 1. Månedlig skatteestimering i SkatTab

Tilføj nyt Card "Estimeret skat pr. måned" mellem "Beregnet årets skat" og "Samlet skyldig oversigt".

**Tabel-kolonner:** Måned | Resultat | Estimeret skat | Akkumuleret skat

**Logik:**
- Realiserede måneder (0..nReal-1): brug `resRow.r[i]`
- Fremtidige måneder: brug gennemsnit af realiserede måneder
- `monthTax = max(0, monthRes × skatPct / 100)`
- Akkumuleret = løbende sum
- Realiserede måneder vises med fed, fremtidige med kursiv/lysere tekst
- Totalrække nederst

**Fil:** `SkatTab.tsx` — nyt Card i grid-sektionen (linje 189-246)

### 2. Fix dashboard: YTD Omsætning og bar chart

**Problem:** Omsætning viser "– kr" fordi `fmt(0)` returnerer '–'. Bar chart viser 0 for alle måneder.

**Root cause:** Der er ingen salgstransaktioner (konto 1xxx) i kassekladden — kun udgifter. Systemet beregner korrekt, men data mangler. Dog er der et sekundært problem: bar chart viser "Udgifter" som `resRow.r[i] - omsRow.r[i]`, men når omsætning er 0, viser den resultatet (som kan være positivt pga. fortegnskonventionen) som udgift.

**Fix i `OverblikTab.tsx`:**
- Bar chart "Udgifter"-beregning: brug sum af udgiftskonti direkte i stedet for `res - oms`, som giver forkerte tal når omsætning er 0
- Beregn udgifter som sum af alle `acct`-rækker med `nr > 1999` pr. måned (allerede tilgængelig via `pl`)
- Gør omsætning-hint mere synligt når der mangler salgsdata

**Fil:** `OverblikTab.tsx` — ændr `chartData` beregning (linje 37-43)

