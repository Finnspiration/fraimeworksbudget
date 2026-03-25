

# Fritekst-søgning i Fremtidige Udgifter

## Ændring

Tilføj et søgefelt i filter-baren der filtrerer på tværs af alle tekstfelter (tekst, bilag, faktura, konto-navn, beløb, dato).

### Fil: `src/components/budget/FutureExpensesTab.tsx`

1. **Ny state**: `const [searchTerm, setSearchTerm] = useState('')`

2. **Udvid `filtered` useMemo** med søgelogik:
   - Lowercase søgeterm matches mod: `tekst`, `bilag`, `faktura`, `dato`, formateret `belob`, kontonummer og kontonavn fra `acctMap`
   - Søgningen sker efter status- og konto-filtrering

3. **UI**: Tilføj `<Input placeholder="Søg..." />` i filter-baren (linje ~385), med et ryd-kryds når der er tekst

### Placering
Søgefeltet placeres i filter-baren mellem konto-filteret og slet-knappen, med passende bredde (`w-48` eller `w-56`).

