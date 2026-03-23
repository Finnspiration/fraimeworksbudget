

# Tilføj opsummering af kommende betalinger i Fremtidige udgifter

## Ændring

**Fil: `src/components/budget/FutureExpensesTab.tsx`**

Tilføj to opsummeringskort lige under header/over filterbaren, der viser:

1. **Næste 7 dage**: Sum af aktive (ikke-matchede) udgifter med dato inden for de næste 7 dage fra i dag
2. **Næste 30 dage**: Sum af aktive udgifter med dato inden for de næste 30 dage fra i dag

Begge beregnes med `useMemo` baseret på `expenses.filter(e => !e.matched)` og datosammenligning mod `new Date()`.

Layout: To små kort side om side (flex-row, gap-3) med beløb i fed og label i lille tekst. Bruger eksisterende `fmtDec` til formatering.

Beregningen er ren client-side og kræver ingen databaseændringer.

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Tilføj to opsummeringskort med 7-dages og 30-dages sum |

