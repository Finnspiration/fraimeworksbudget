
# Stabil moms-løsning for resultatopgørelse + tydelig pipeline-visning

## Hvad jeg har verificeret i koden
- Importerede indbetalinger i databasen ligger som bruttobeløb, fx konto `1010` med `moms = NULL`.
- Kontoplanen i databasen har allerede `1010 = U25`, så moms kan udledes på kontoniveau.
- Problemet er ikke kun ét sted: moms-logikken er spredt over flere filer (`budget-utils`, `PipelineTab`, `OverblikTab`, `SkatTab`, `CellWithTooltip`) med forskellige lokale beregninger.
- `ResultatTab`-tooltips bruger stadig rå transaktioner uden at få `activePL` med ind, så de kan vise forkerte bruttobeløb selv når resten burde være nettobaseret.
- Pipeline blander to forskellige datatyper:
  - manuelle jobs: indtastes ekskl. moms
  - importerede indbetalinger: kommer ind inkl. moms fra kassekladden

## Plan

### 1. Saml al momslogik i én fælles helper
**Fil:** `src/lib/budget-utils.ts`

Jeg vil erstatte de spredte ad hoc-beregninger med én delt helper, fx en funktion der returnerer:
- effektiv momskode
- beløb ekskl. moms
- momsbeløb
- beløb inkl. moms
- signed/net værdi til brug i resultatopgørelsen

Den skal bruge samme prioritet hver gang:
1. transaktionens egen `moms`
2. kontoens `moms` fra aktiv kontoplan
3. fallback fra kontonavn / konto-type

Det bliver den eneste kilde til sandhed for moms.

### 2. Ret resultatopgørelsen ved kilden
**Fil:** `src/lib/budget-utils.ts`

`computeRealized()` skal omskrives til altid at bruge den fælles helper, så realiserede tal i resultatopgørelsen altid bygger på **ekskl. moms**.

Det er her den stabile løsning ligger:
- importerede kassekladde-indbetalinger omregnes til netto før de rammer PL
- manuelt indtastede pipeline-job påvirker fortsat budgettet ekskl. moms
- resultatopgørelsen viser konsekvent netto-tal i alle tilfælde

### 3. Ensret alle andre visninger til samme logik
**Filer:**
- `src/components/budget/CellWithTooltip.tsx`
- `src/components/budget/ResultatTab.tsx`
- `src/components/budget/OverblikTab.tsx`
- `src/components/budget/SkatTab.tsx`

Jeg vil fjerne lokal moms-matematik i disse komponenter og bruge den fælles helper overalt.

Vigtigt:
- `ResultatTab` skal sende `activePL` videre til tooltip-laget, så tooltips ikke længere viser bruttobeløb for importerede poster med tom `moms`.
- Overblik og Skat skal regne salgsmoms/købsmoms ud fra samme resolver som resultatopgørelsen.

### 4. Gør salgspipeline meget tydelig med både inkl. og ekskl. moms
**Fil:** `src/components/budget/PipelineTab.tsx`

Jeg vil ændre tabellen, så alle rækker viser moms eksplicit.

#### For manuelle pipeline-jobs
Beløbet er fortsat input **ekskl. moms**.
Der vises derefter:
- Ekskl. moms
- Moms
- Inkl. moms
- Vægtet ekskl. moms

`Inkl. moms` beregnes automatisk ud fra kontoens momskode.

#### For importerede indbetalinger fra kassekladden
Beløbet kommer ind som **inkl. moms**.
Der vises derfor:
- Ekskl. moms (beregnet)
- Moms
- Inkl. moms (det oprindelige indbetalte beløb)
- Vægtet ekskl. moms = 100%

#### Tydelig mærkning
Jeg vil samtidig gøre kildeforskellen synlig, fx ved at markere:
- “Manuel”
- “Importeret”

og opdatere kolonneoverskrifter/KPI-tekster, så det fremgår hvad der er inkl. vs. ekskl. moms.

### 5. Gør importen mere robust fremover
**Fil:** `src/components/budget/ImportTab.tsx`

Når en importeret post ikke har momskode i filen, vil importen automatisk forsøge at sætte den ud fra kontoplanen.

Det er ikke nok alene, men det gør løsningen mere stabil fremadrettet:
- eksisterende data rettes i runtime via helperen
- nye importer bliver mindre afhængige af fallback-logik

## Resultat efter ændringen
- Resultatopgørelsen viser altid beløb **uden moms**
- Tooltips i resultatopgørelsen matcher de viste netto-tal
- Pipeline viser for alle rækker både:
  - ekskl. moms
  - moms
  - inkl. moms
- Manuelle jobs forbliver budget-/forecast-baseret på ekskl. moms
- Importerede indbetalinger fra kassekladden omregnes tydeligt fra brutto til netto
- Momslogikken findes kun ét sted, så samme fejl ikke opstår igen

## Berørte filer
- `src/lib/budget-utils.ts`
- `src/components/budget/PipelineTab.tsx`
- `src/components/budget/CellWithTooltip.tsx`
- `src/components/budget/ResultatTab.tsx`
- `src/components/budget/OverblikTab.tsx`
- `src/components/budget/SkatTab.tsx`
- `src/components/budget/ImportTab.tsx`
