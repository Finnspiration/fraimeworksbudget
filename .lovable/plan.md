## Plan: Unit tests for beregningskernen

Opret `src/lib/budget-utils.test.ts` med Vitest-tests der dækker de fire kernefunktioner i `src/lib/budget-utils.ts`. Tests kører via eksisterende `vitest` opsætning (samme som `src/lib/import-utils.test.ts`).

### Testcases

**`getRevenueAccounts(plRows)`**
- Standard PL (`PL` fra `budget-constants`): returnerer alle konti før første `total`-række + 4310, 4360, 4610.
- Custom PL uden 4310/4360/4610-rækker: sættet indeholder stadig de tre eksplicitte konti.
- PL uden nogen `total`-række: alle `acct`-konti klassificeres som revenue.
- Tom PL: kun {4310, 4360, 4610}.

**`resolveEffectiveMoms(txMoms, konto, plRows)`**
- Eksplicit `txMoms` returneres uændret (fx `'U25'`), også når kontoen ville have gættet noget andet.
- Konto med `moms`-felt på PLRow bruges når `txMoms` er null.
- Label indeholder `"u/moms"` → null.
- Label indeholder `"m/moms"` på revenue-konto (fx 1010, 4610) → `'U25'`.
- Label indeholder `"m/moms"` på udgiftskonto (fx 1310, 2010) → `'I25'`.
- Ingen match (ukendt konto, intet label): null.

**`computeRealized(txns, year, plRows)`**
- Enkelt transaktion med `U25`-moms: `belob` divideres med 1.25, gemmes negeret på `konto-måned`-nøgle.
- Transaktion uden moms: rå `belob` bruges (negeret).
- Transaktioner i andet år end `YEAR` ignoreres.
- Ugyldig/manglende dato ignoreres.
- Flere transaktioner på samme konto+måned summeres.
- Fallback via label ("m/moms" på 1310) klassificeres som I25 og nettes med 1.25.

**`computePL(realized, budget, plRows)`**
- `acct`/`bal`-rækker får 12-element `r`/`b`-arrays fra realized-map og budget-record.
- Manglende værdier bliver 0.
- `total` med `range:1010-1065` summerer alle acct-konti i intervallet korrekt pr. måned for både `r` og `b`.
- `total` med `grp:` summerer korrekt.
- `res`/`final` med `id:`-reference til andre totals summeres videre (kædet aggregation).
- Tomt input giver stadig valid struktur med nul-arrays.

### Tekniske detaljer

- Fil: `src/lib/budget-utils.test.ts`
- Framework: Vitest (`describe`/`it`/`expect`), matcher eksisterende teststil.
- Bruger `PL` og `YEAR` fra `@/data/budget-constants` samt mindre håndlavede `PLRow[]`-fixtures for edge cases.
- Ingen ændringer i produktionskode; ingen nye afhængigheder.
- Verificering: kør `bunx vitest run src/lib/budget-utils.test.ts` efter oprettelse.
