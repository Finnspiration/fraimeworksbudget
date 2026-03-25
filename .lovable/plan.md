

# Fix: Robust kundeallokering for importerede transaktioner

## Problem
Når en kunde tildeles en importeret transaktion, gemmes `customer_id` korrekt i databasen. Men `setTxns` i `use-db-state.ts` sletter **alle** transaktioner og genindsætter dem — uden at inkludere `customer_id`. Så ved næste import/redigering mistes alle kundetildelinger.

Derudover mangler `customer_id` i `Transaction`-interfacet.

## Løsning

### 1. `src/data/budget-constants.ts`
Tilføj `customer_id?: string | null` til `Transaction`-interfacet.

### 2. `src/hooks/use-db-state.ts`
I `setTxns`-funktionen: inkludér `customer_id` i mappingen, så det bevares ved delete+reinsert:
```typescript
const rows = newTxns.map((t: Transaction) => ({
  ...existing fields...,
  customer_id: t.customer_id ?? null,
}));
```

Og i fetch-mappingen (queryFn for `db_transactions`): inkludér `customer_id` fra databasen:
```typescript
customer_id: r.customer_id ?? null,
```

### 3. `src/hooks/use-pipeline.ts`
I `useAssignCustomerToTxn` — efter succesfuld opdatering, invalidér også `db_transactions` querien så det lokale cache opdateres:
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['revenue_transactions'] });
  qc.invalidateQueries({ queryKey: ['db_transactions'] });
},
```

## Omfang
3 filer ændres. Kundetildelinger overlever nu transaktions-reimport.

