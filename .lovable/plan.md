

# Rettelser: Decimaler, Faktura/Modkonto i import, og menu-label

## Ændringer

### 1. Vis beløb med to decimaler (`budget-utils.ts`)
- Tilføj ny `fmtDec` funktion med `minimumFractionDigits: 2, maximumFractionDigits: 2` til brug i kassekladden
- Behold eksisterende `fmt` (uden decimaler) til P&L og overblik

### 2. Brug `fmtDec` i ImportTab (`ImportTab.tsx`)
- Erstat `fmt(t.belob)` med `fmtDec(t.belob)` i både forhåndsvisning og kassekladde-tabel
- Sikrer at beløb som `18,73` og `1.989,00` vises korrekt med decimaler

### 3. Verificér Faktura og Modkonto parsing (`ImportTab.tsx`)
- Kolonnerne er allerede i koden (linje 69-70, 81-82) og vises i tabellerne
- Problemet kan være at Excel-headeren ikke matches korrekt — tilføj mere fleksibel header-matching for "faktura" (match også "fak") og "modkonto" (match også "mod")

### 4. Omdøb menu-tab fra "Import" til "Kassekladde" (`Index.tsx`)
- Ændr TabsTrigger-teksten fra "Import" til "Kassekladde"
- Skift ikon fra `Upload` til `FileSpreadsheet` for bedre semantik

