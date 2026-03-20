

# Import af kontoplan fra Excel

## Koncept
Tilføj mulighed for at importere en kontoplan fra Excel, som erstatter den hardkodede `PL`-array i systemet. Kontoplanen definerer strukturen i resultatopgørelsen.

## Excel-format (fra brugerens billeder)
Kolonner: **Nr, Navn, Type, Moms, Sumfra**

Type-koder:
- 1 = Drift (konto-linje, svarer til `acct`)
- 2 = Balance (springes over i P&L)
- 3 = SumFra (total-linje, summerer fra en given konto)
- 4 = Overskrift (sektion-header, svarer til `sec`)
- 5 = Overskrift Start (sektion-header med spacing)
- 6 = SumInterval (sum af et interval)

## Ændringer

### 1. Kontoplan-state i `use-budget-state.ts`
- Tilføj `customPL` state (type `PLRow[] | null`) med localStorage-persistering
- Tilføj `setCustomPL` setter
- `computePL` bruger `customPL ?? PL` (fallback til hardkodet)

### 2. Kontoplan-import-sektion i `ImportTab.tsx`
- Ny Card øverst: "Importér kontoplan" med drag/drop (samme mønster som kassekladde)
- Parser der mapper Excel-rækker til `PLRow[]`:
  - Type 1 (Drift) → `{ t:'acct', nr, lbl, grp }` — grp udledes fra nærmeste overliggende overskrift
  - Type 2 (Balance) → springes over
  - Type 3 (SumFra) → `{ t:'total', nr, lbl, id, sum }` — sum beregnes fra "Sumfra"-kolonnen
  - Type 4 (Overskrift) → `{ t:'sec', lbl }`
  - Type 5 (Overskrift Start) → `{ t:'sp' }` + `{ t:'sec', lbl }`
  - Type 6 (SumInterval) → `{ t:'res', lbl, id, sum }` — resultatrække der summerer foregående totaler
- Forhåndsvisning af den parsede kontoplan inden godkendelse
- Knap til at nulstille til standard-kontoplanen

### 3. Opdater `budget-utils.ts`
- `computePL` og `computeRealized` modtager `PLRow[]` som parameter i stedet for at importere `PL` direkte
- Alle kald opdateres til at sende den aktive kontoplan med

### 4. Opdater `ResultatTab.tsx`
- Brug den aktive kontoplan (`customPL ?? PL`) fra state i stedet for den importerede `PL`-konstant

### 5. Opdater `Index.tsx`
- Pass `customPL` og `setCustomPL` til relevante komponenter
- Pass aktiv kontoplan til `OverblikTab` og `SkatTab`

## Teknisk detalje
- Mapping fra Type-koder til PLRow-typer sker i parseren
- `grp`-feltet (brugt til summering) udledes automatisk: hver overskrift starter en ny gruppe, og alle drift-konti under den får samme grp-id
- `SumFra`-kolonnen angiver startkontoen for summeringen — parseren finder alle acct-rækker fra det nummer og op til total-rækken
- Balance-konti (type 2) ignoreres da de ikke hører til i resultatopgørelsen

