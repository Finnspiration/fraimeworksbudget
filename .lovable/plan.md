

# Fix: Pipeline-beløb gemt permanent i budget-databasen

## Problem

Konto 1010 maj har **114.000** gemt i `budget_entries`-tabellen i stedet for de forventede **50.000**. Pipeline-jobbet (32.000 × 100%) lægges så oven i → 146.000.

Årsag: Da data blev migreret fra localStorage til databasen, indeholdt localStorage allerede de "forurenede" budget-tal (base + pipeline var blevet gemt sammen i den gamle kode).

## Løsning

### 1. Ret korrupt data i databasen
Opdatér `budget_entries` for konto 1010, month_index 4 fra 114.000 til 50.000 (migration).

### 2. Forebyg fremtidig forurening
Koden er allerede korrekt — `mergedBudget` er kun en `useMemo` i Index.tsx og skrives aldrig til databasen. `setBudget` gemmer kun base-budgettet. Ingen kodeændring nødvendig.

## Fil
- Én database-migration: `UPDATE budget_entries SET amount = 50000 WHERE konto = 1010 AND month_index = 4;`

