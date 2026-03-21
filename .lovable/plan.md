

# Flyt alle data til databasen

## Overblik

Alt data gemmes i dag i localStorage (kassekladde, budget, kontoplan, skatteindstillinger). Dette skal flyttes til Supabase-tabeller, så data persisteres sikkert og kan tilgås fra enhver enhed.

## Nye database-tabeller

### `transactions` — Kassekladde
| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | serial PK | |
| dato | date | |
| type | text | |
| bilag | text | |
| tekst | text | |
| belob | numeric | |
| konto | integer | |
| moms | text | nullable |
| modkonto | integer | nullable |
| faktura | text | nullable |

### `budget_entries` — Budgettal pr. konto/måned
| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | uuid PK | |
| konto | integer | Kontonummer |
| month_index | integer | 0-11 |
| amount | numeric | Budgetbeløb |
| UNIQUE(konto, month_index) | | |

### `chart_of_accounts` — Kontoplan (PLRow)
| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | uuid PK | |
| sort_order | integer | Rækkefølge |
| row_type | text | 'sec','acct','total','res','final','sp' |
| label | text | nullable |
| nr | integer | nullable (kontonummer) |
| grp | text | nullable |
| row_id | text | nullable (id for totaler) |
| sum_formula | text | nullable (sum-udtryk) |

### `settings` — Nøgle/værdi for diverse indstillinger
| Kolonne | Type | Beskrivelse |
|---|---|---|
| key | text PK | f.eks. 'n_real', 'skat_pct', 'budget_mode', 'virksomhedstype' |
| value | jsonb | Værdi |

### `bskat_rates` — B-skat/aconto rater
| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | integer PK | Ratenummer |
| belob | numeric | |
| forfald | text | |
| betalt | numeric | |
| betalt_dato | text | |

### `moms_betalt` — Momsbetaling pr. kvartal
| Kolonne | Type | Beskrivelse |
|---|---|---|
| quarter | integer PK | 1-4 |
| amount | numeric | |

## Ændringer i koden

### 1. Ny hook: `src/hooks/use-db-state.ts`
Erstatter `use-budget-state.ts`. Bruger React Query til at hente/gemme alle data fra Supabase i stedet for localStorage. Funktionelt identisk interface (samme return-type), men med async load og auto-save via mutations.

### 2. Seed-logik
Ved første load (tomme tabeller): indsæt INIT_TXN, INIT_BUDGET og standard PL som seed-data, så appen fungerer med det samme.

### 3. Migration af eksisterende localStorage-data  
Check om localStorage har data → hvis tabeller er tomme og localStorage har data, migrer det automatisk ved første load.

### 4. ImportTab, ResultatTab, SkatTab
Ingen ændringer i komponent-logik — de modtager allerede data via props. Kun `Index.tsx` skifter fra `useBudgetState()` til `useDbState()`.

### 5. RLS
Alle tabeller oprettes med `USING (true)` RLS (single-user app uden auth). Kan strammes op når auth tilføjes.

## Rækkefølge
1. Opret alle tabeller (migration)
2. Byg `use-db-state.ts` hook med React Query
3. Opdater `Index.tsx` til at bruge ny hook
4. Test at import, budget-redigering og skat-indstillinger stadig virker

