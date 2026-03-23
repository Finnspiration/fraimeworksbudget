

# Skjul balancekonti i resultatopgørelsen

## Problem

Balancekonti (type `bal`, fx konto 1950 "Mellemregning med andre banker") vises stadig som rækker i resultatopgørelsen. De er korrekt ekskluderet fra P&L-summer, men de hører slet ikke hjemme i resultatopgørelsen.

## Løsning

### Fil: `src/components/budget/ResultatTab.tsx`

Fjern `bal`-rækker fra rendering i resultatopgørelsen:

- **Linje 94**: Ændr `(row.t === 'acct' || row.t === 'bal')` → `row.t === 'acct'` (sektionssynlighed)
- **Linje 119**: Ændr `if (row.t === 'acct' || row.t === 'bal')` → `if (row.t === 'acct')` (række-rendering)

Balancekonti forbliver i `vals` (til intern beregning) og i kassekladdens kontovalidering, men vises ikke i resultatopgørelsen.

### Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/ResultatTab.tsx` | Fjern `bal` fra rendering (2 steder) |

