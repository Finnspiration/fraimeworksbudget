

# Fremtidige udgifter — ny fane med auto-matching mod kassekladde

## Koncept

En ny tabel `future_expenses` i databasen og en ny fane "Fremtidige udgifter" i appen. Strukturen matcher kassekladdens `Transaction`-type. Når nye posteringer importeres i kassekladden, sammenlignes de automatisk mod fremtidige udgifter — matches fjernes fra listen. Beløbene indgår i budgetberegningen (ligesom pipeline allerede gør), men med 100% sandsynlighed og præcis konto+måned.

## Database

Ny tabel `future_expenses`:

| Kolonne | Type | Bemærkning |
|---|---|---|
| id | uuid (PK) | auto-genereret |
| dato | date | Forventet dato |
| tekst | text | Beskrivelse |
| belob | numeric | Beløb |
| konto | integer | Kontonummer fra kontoplanen |
| moms | text | Nullable |
| bilag | text | Nullable — udfyldes evt. |
| modkonto | integer | Nullable |
| faktura | text | Nullable |
| matched | boolean | Default false — sættes true når matchet |
| matched_txn_id | integer | Nullable — ref til den matchede transaktion |
| created_at | timestamptz | Default now() |

RLS: public access (som de andre tabeller).

## Auto-matching ved kassekladde-import

I `ImportTab.tsx` `doImport()`: efter nye rækker er importeret, kør en match mod aktive (ikke-matchede) fremtidige udgifter. Match-kriterier:
- **Konto** er ens
- **Beløb** er ens (inden for 1 kr margin)
- **Dato** er inden for ±30 dage af den forventede dato

Ved match: sæt `matched = true` og `matched_txn_id` på den fremtidige udgift. Vis en besked: "✓ X fremtidige udgifter blev matchet".

## Budget-integration

I `Index.tsx` `mergedBudget`: tilføj ikke-matchede fremtidige udgifter til budgettet (ligesom pipeline, men med 100% vægt). Udgifter fordeles på konto + måned baseret på `dato`.

## Ny fane: "Fremtidige udgifter"

Ny fane i tab-baren (ikon: `CalendarClock`). UI:
- Tabel med kolonner: Dato, Tekst, Beløb, Konto, Moms, Status (aktiv/matchet)
- Formularer til at tilføje/redigere/slette udgifter
- Matchede udgifter vises gennemstreget/grå med link til den matchede postering
- Kontovalidering mod den aktive kontoplan (som kassekladden)

## Filer der ændres/oprettes

| Fil | Ændring |
|---|---|
| Database migration | Opret `future_expenses` tabel |
| `src/components/budget/FutureExpensesTab.tsx` | Ny komponent — tabel + CRUD |
| `src/hooks/use-future-expenses.ts` | React Query hook til CRUD + matching |
| `src/pages/Index.tsx` | Tilføj fane, merge fremtidige udgifter i budget |
| `src/components/budget/ImportTab.tsx` | Kald matching-logik efter import |
| `src/hooks/use-db-state.ts` | Eksportér activePL til brug i FutureExpensesTab |

