

# Største kunder: Inkludér kassekladde-indbetalinger (eks. moms)

## Ændring

I `src/components/budget/OverblikTab.tsx`, udvid `topCustomers`-beregningen (linje 114-126) til også at inkludere transaktioner fra `txns` der har en `customer_id`.

### Logik

1. Behold eksisterende pipeline-baserede kundebeløb (vægtet)
2. Tilføj: for hver transaktion i `txns` med negativt beløb og `customer_id` — find kundenavnet og tilføj beløbet eks. moms:
   - Hvis `moms === 'U25'`: `Math.abs(belob) / 1.25`
   - Ellers: `Math.abs(belob)`
3. Kundenavne hentes via `customers`-join — `txns` har allerede `customer_id`, men ikke kundenavn. Behøver enten:
   - At sende `useRevenueTransactions()`-data (som allerede joiner kundenavn) som prop, eller
   - At bruge kundelisten til at slå navne op

**Valgt tilgang**: Importér og kald `useRevenueTransactions()` direkte i OverblikTab (ligesom PipelineTab gør), da den allerede joiner `customers(name)`. Ingen prop-ændring nødvendig.

### Fil: `src/components/budget/OverblikTab.tsx`

- Importér `useRevenueTransactions` fra `@/hooks/use-pipeline`
- Kald hooken i komponenten
- I `topCustomers` useMemo: iterer også over revenue transactions med `customer_id`, beregn eks. moms beløb, og akkumulér pr. kunde

```typescript
// Tilføj kassekladde-indbetalinger eks. moms
for (const txn of revenueTxns) {
  if (!txn.customer_id || !txn.customers?.name) continue;
  const exMoms = txn.moms === 'U25' ? Math.abs(txn.belob) / 1.25 : Math.abs(txn.belob);
  map[txn.customers.name] = (map[txn.customers.name] || 0) + exMoms;
}
```

