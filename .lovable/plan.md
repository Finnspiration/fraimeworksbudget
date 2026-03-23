

# Tilføj filtrering i Fremtidige udgifter

## Ændring

**Fil: `src/components/budget/FutureExpensesTab.tsx`**

Tilføj en filterbar over tabellen med to filtre:

1. **Status-filter**: Toggle-gruppe med "Alle", "Aktive", "Matchede" (brug `ToggleGroup` fra shadcn)
2. **Konto-filter**: Genbrug `KontoPicker`-komponenten (allerede i filen) med en "Alle konti" default-mulighed

Tilføj state: `filterStatus: 'all' | 'active' | 'matched'` og `filterKonto: number | null`.

Filtrér `expenses` med en `useMemo`:
```typescript
const filtered = useMemo(() => expenses.filter(e => {
  if (filterStatus === 'active' && e.matched) return false;
  if (filterStatus === 'matched' && !e.matched) return false;
  if (filterKonto && e.konto !== filterKonto) return false;
  return true;
}), [expenses, filterStatus, filterKonto]);
```

Brug `filtered` i stedet for `expenses` i tabel-renderingen. Behold `activeCount`/`matchedCount`/`activeTotal` baseret på ufiltrerede `expenses`.

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Tilføj filterbar med status-toggle og konto-dropdown, filtrér tabeldata |

