

# Kundeindbetalinger fra kassekladde i salgspipeline-listen

## Overblik

Indtægtstransaktioner (negative beløb) fra kassekladden vises direkte i pipeline-tabellen med status "betalt". Brugeren kan tilknytte en kunde til hver indbetaling via dropdown.

## 1. Database: Tilføj `customer_id` til `transactions`

Migration:
```sql
ALTER TABLE transactions ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
```

## 2. Hooks (`src/hooks/use-pipeline.ts`)

- Tilføj `useRevenueTransactions()` — henter transaktioner med negativt beløb, joined med `customers(name)`
- Tilføj `useAssignCustomerToTxn()` — mutation der opdaterer `customer_id` på en transaktion

## 3. Status-liste (`src/components/budget/PipelineTab.tsx`)

- Tilføj ny status `betalt` med grøn styling til `STATUS_OPTIONS`
- Hent revenue transactions via `useRevenueTransactions()`
- Map transaktioner til samme row-format som pipeline-jobs og merge dem ind i tabellen (sorteret efter dato)
- Transaktions-rækker viser:
  - **Kunde**: Select-dropdown med kundelisten (via `useAssignCustomerToTxn`)
  - **Beskrivelse**: `txn.tekst`
  - **Beløb**: `Math.abs(txn.belob)`
  - **Sandsynlighed**: 100%
  - **Vægtet**: = beløb
  - **Dato**: `txn.dato`
  - **Status**: Fast "Betalt" badge (ikke redigerbar)
  - **Handlinger**: Ingen slet/rediger (det er kassekladde-data)

## 4. Props-ændringer

- `PipelineTab` behøver ikke nye props — data hentes direkte via hooks fra databasen
- `Index.tsx` uændret

## Filer

| Fil | Ændring |
|---|---|
| Database migration | Tilføj `customer_id` til `transactions` |
| `src/hooks/use-pipeline.ts` | `useRevenueTransactions` + `useAssignCustomerToTxn` |
| `src/components/budget/PipelineTab.tsx` | Merge indbetalinger i pipeline-tabel, kunde-dropdown |

