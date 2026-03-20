

# Opdater import-parser til det korrekte kassekladde-format

## Problem
Det nuværende importformat matcher ikke det faktiske Excel-format fra regnskabsprogrammet. Formatet har kolonnerne: **Type, Dato, Bilag, Faktura, Tekst, Beløb, Konto, Moms, Modkonto**.

Derudover bruger dato-formatet `dd.mm.yyyy` (f.eks. `25.02.2026`) og beløb bruger dansk format med komma som decimaltegn og punktum som tusindtalsseparator (f.eks. `1.989,00`).

## Ændringer

### 1. Opdater header-søgning (`ImportTab.tsx`)
- Tilføj "type" og "modkonto" som mulige header-kolonner der kan genkendes
- Gør header-match mere fleksibel: match også på "type" + "konto" kombination (ikke kun "konto" + "beløb")

### 2. Tilføj "Type"-kolonne-mapping
- Parse "Type"-kolonnen (Finansbilag, Kundeindbetaling, etc.) og gem den i transaktionens `type`-felt

### 3. Fix dato-parsing for `dd.mm.yyyy`-format
- Konvertér `25.02.2026` → `2026-02-25` (ISO-format) ved at splitte på `.` og vende rækkefølgen

### 4. Fix beløb-parsing for dansk talformat
- Fjern tusindtalsseparator (`.`) og erstat komma (`,`) med punktum inden `Number()` konvertering
- F.eks. `1.989,00` → `1989.00`

### 5. Tilføj "Faktura"-kolonne (valgfri)
- Parse faktura-nummer hvis kolonnen findes

### 6. Opdater kassekladde-tabel i bunden
- Vis "Type"-kolonne i visningen af importerede posteringer

## Teknisk detalje
Alle ændringer sker i `src/components/budget/ImportTab.tsx`. Transaction-interfacet har allerede `type`-felt, så ingen ændring i constants behøves.

