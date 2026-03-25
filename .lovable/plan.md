

# Avanceret matching af fremtidige udgifter mod kassekladde

## Problem
Den nuværende matching kræver eksakt konto + beløb (±1 kr) + dato inden for 7 dage. I praksis afviger tekster altid, og datoen i fremtidige udgifter er et estimat. Alle fremtidige udgifter med dato før seneste kassekladde-postering burde kunne matches.

## Ny matching-strategi

### Matching-kriterier (prioriteret scoring)
Hver fremtidig udgift med dato ≤ seneste kassekladde-dato scores mod alle ubrugte kassekladde-posteringer:

1. **Konto** (påkrævet): Skal matche eksakt — ellers ingen match
2. **Beløb** (vægtet score):
   - Eksakt (±1 kr): 50 point
   - Tæt (±5%): 30 point
   - Nogenlunde (±15%): 10 point
3. **Dato-nærhed** (vægtet score):
   - Samme dag: 30 point
   - ±7 dage: 20 point
   - ±30 dage: 10 point
   - Længere væk: 5 point
4. **Tekst-lighed** (bonus):
   - Simple token-overlap (ord der matcher): op til 20 point

**Threshold**: Minimum 40 point for auto-match. Under 40 → foreslås som kandidat.

### UI: Review-dialog for matches
I stedet for bare at auto-matche, vises en **review-dialog**:
- Liste af foreslåede matches med score
- Brugeren kan godkende/afvise hver match
- Viser begge siders tekst, beløb, dato side-by-side
- Checkbox per match, "Godkend valgte" knap

### Teknisk plan

#### 1. `src/hooks/use-future-expenses.ts`
- Ny funktion `findMatchCandidates(txns)` der returnerer `Array<{ expense: FutureExpense, candidates: Array<{ txn: Transaction, score: number }> }>`
- Score-beregning med konto, beløb, dato, tekst-tokens
- Behold `matchAgainstTransactions` men lad den kalde `findMatchCandidates` og auto-matche dem over threshold
- Ny `matchExpenseToTxn(expenseId, txnId)` funktion til manuel godkendelse

#### 2. `src/components/budget/FutureExpensesTab.tsx`
- Ny `MatchReviewDialog` komponent der viser match-kandidater
- "Match mod kassekladde" knappen åbner dialogen i stedet for at auto-matche
- Tabel med kolonner: Fremtidig udgift (tekst, beløb, dato) | Kassekladde-match (tekst, beløb, dato) | Score | Checkbox
- "Godkend valgte" og "Annuller" knapper

#### 3. `src/lib/budget-utils.ts`
- Ny `computeMatchScore(expense, txn)` utility-funktion
- `tokenOverlap(a, b)` hjælpefunktion for tekst-sammenligning

### Filer

| Fil | Ændring |
|---|---|
| `src/lib/budget-utils.ts` | Ny `computeMatchScore` + `tokenOverlap` |
| `src/hooks/use-future-expenses.ts` | `findMatchCandidates`, `matchExpenseToTxn`, opdateret `matchAgainstTransactions` |
| `src/components/budget/FutureExpensesTab.tsx` | Ny `MatchReviewDialog`, opdateret knap-logik |

