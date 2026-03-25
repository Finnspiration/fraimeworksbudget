

# Match fremtidige udgifter mod kassekladde

## Problem
Matching af fremtidige udgifter mod kassekladde-posteringer sker kun automatisk ved import. Der er ingen mulighed for manuelt at køre matching, så allerede importerede posteringer kan ikke matches efterfølgende.

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

Tilføj en **"Match mod kassekladde"**-knap i toolbar-området (ved siden af bulk-slet knappen), der:
1. Modtager `txns` (kassekladde-posteringer) og `matchAgainstTransactions` som nye props
2. Kalder `matchAgainstTransactions(txns)` og viser en toast med antal matches

### Fil: `src/pages/Index.tsx`

Send `txns` og `matchAgainstTransactions` som props til `FutureExpensesTab`:
```tsx
<FutureExpensesTab 
  activePL={state.activePL} 
  txns={state.txns} 
  matchAgainstTransactions={matchAgainstTransactions} 
/>
```

### UI
En knap med ikon (fx `Check` eller `Link`) og teksten "Match mod kassekladde" placeret i filterlinjen. Viser toast: "X udgifter matchet" eller "Ingen nye matches fundet".

| Fil | Ændring |
|---|---|
| `src/pages/Index.tsx` | Send txns + matchAgainstTransactions som props |
| `src/components/budget/FutureExpensesTab.tsx` | Ny prop-typer, match-knap i toolbar |

