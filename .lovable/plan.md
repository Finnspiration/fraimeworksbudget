

# Udvid ImportTab: Modkonto, indtægts-allokering, sortering og filtrering

## Ændringer

### 1. Udvid Transaction-interface (`budget-constants.ts`)
- Tilføj `modkonto?: number` og `faktura?: string` felter

### 2. Opdater import-parser (`ImportTab.tsx`)
- Parse "Modkonto"-kolonnen fra Excel
- Negative beløb = indtægter: sæt default `konto: 1010` (kan overskrives manuelt)
- Positive beløb = udgifter: brug konto fra filen som hidtil

### 3. Tilføj sortering i kassekladde-tabellen
- Klikbare kolonne-headers (Dato, Beløb, Konto, Type, Bilag)
- Toggle ascending/descending ved klik
- Vis sorterings-indikator (▲/▼) på aktiv kolonne

### 4. Tilføj filtrering i kassekladde-tabellen
- Søgefelt (fritekst) der filtrerer på tværs af alle kolonner
- Dropdown-filter for Type (Finansbilag, Kundeindbetaling, etc.)
- Dropdown-filter for Moms (I25, null/ingen)
- Vis antal filtrerede vs. totale posteringer

### 5. Tilføj Modkonto-kolonne i kassekladde-visningen
- Vis modkonto i tabellen
- Gør konto-cellen redigerbar (klik → input) så indtægter kan flyttes til anden konto end 1010

### 6. Opdater forhåndsvisning
- Vis modkonto-kolonne i preview-tabellen

## Teknisk detalje
- Sortering og filtrering sker client-side med `useMemo` over `txns`
- Redigerbar konto bruger samme inline-edit pattern som budget-cellerne i ResultatTab
- Indtægts-logik: `belob < 0` → default konto 1010 (medmindre filen allerede har en konto i 1xxx-range)

