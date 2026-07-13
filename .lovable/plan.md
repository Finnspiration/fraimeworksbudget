
# Likviditet & gæld i Resultatopgørelsen

Tilføj en foldbar sektion nederst i Resultatopgørelsen med månedlige rækker for moms, B-skat/aconto-skat, øvrig gæld og driftskontosaldo — både realiseret og budgetteret, i samme kolonnestruktur som resten af P&L.

## Nye indstillinger (Skat & Moms-fanen)

Tilføj et lille "Konti & saldi"-kort hvor brugeren én gang mapper:
- **Driftskonto-primo pr. 1/1** (tal, kr).
- **Driftskonto-konto(er)** — balancekonti hvor bankbevægelser bogføres (multi-select fra kontoplanen).
- **B-skat/aconto-skat-konto(er)** — konti hvor betalt B-skat/selskabsskat bogføres.
- **Øvrig gæld-konto(er)** — konti hvor øvrige gældsposter afregnes.
- **Moms-afregningskonto(er)** — konti hvor moms-udbetaling til Skat bogføres (bruges til realiseret moms-betalt pr. måned; supplerer/erstatter kvartalsfelterne).

Gemmes i `settings`-tabellen som ét JSON-objekt (`liquidity_config`) + felt på `useDbState`. Ingen ændringer i eksisterende B-skat/moms-input; det nye er kun til at plotte "realiseret pr. måned".

## Nye rækker i Resultatopgørelsen

Foldbar sektion **"💧 Likviditet & gæld"** vist under `res`/`final`-rækkerne. Hver række har 12 månedskolonner + I ALT, med både r (realiseret) og b (budget) på samme visning som eksisterende rækker (realiseret venstre/primær, budget dæmpet efter `nReal` — matcher nuværende Cell-styling).

Rækker:
1. **Salgsmoms** — genbrug `budgetSalgsMomsPerMonth` / `realSalgsMomsPerMonth` fra `SkatTab`.
2. **Købsmoms** — genbrug `budgetKobsMomsPerMonth` / `realKobsMomsPerMonth`.
3. **Netto moms (skyldig)** — Salgsmoms − Købsmoms pr. måned.
4. **Moms betalt** — realiseret: transaktioner på moms-afregningskonto pr. måned; budget: `momsBetalt[q]` fordelt på forfaldsmåneden (jul/okt/jan/apr).
5. **B-skat / Aconto skat** — realiseret: transaktioner på B-skat-konto(er) pr. måned; budget: `bskat[i].belob` placeret i forfaldsmåneden fra `bskat[i].forfald`.
6. **Øvrig gæld** — realiseret: transaktioner på øvrig-gæld-konto(er) pr. måned; budget: `andenGeld` fordelt (fx sidste måned eller pro rata — vi bruger sidste måned, konsistent med hvordan den vises i Overblik).
7. **Driftskonto (saldo ultimo)** —
   - Realiseret ultimo m: `primo + Σ (alle bogførte bevægelser på driftskonto-konti t.o.m. måned m)`.
   - Budgetteret ultimo m: `primo + Σ (måneders netto-cashflow t.o.m. m)`, hvor netto-cashflow pr. måned = P&L-resultat (`res.b` for fremtidige måneder, `res.r` for realiserede) + moms ind (`Salgsmoms`) − moms ud (Salgsmoms−Købsmoms betalt i forfaldskvartal, dvs. Moms-betalt-rækken) − B-skat betalt − øvrig gæld betalt. Ren tilnærmelse; nøjagtig nok til likviditets-trend.
   - Cell viser saldoen ultimo måneden (ikke ændring). Farve: rød når negativ.

Alle rækker bruger den samme Cell-komponent som resten (dæmpet for i ≥ nReal på budget-siden), og respekterer collapse-state.

## Genbrug / refaktor

Flyt momsberegningen (`budget*/real*MomsPerMonth`) ud i `src/lib/budget-utils.ts` som rene helpers:
- `computeMomsPerMonth(pl, activePL) → { salgsBudget, kobsBudget }`
- `computeRealMomsPerMonth(txns, activePL) → { salgs, kob }`

Både `SkatTab` og `ResultatTab` importerer dem, så tallene stemmer 1:1.

## Teknisk

Filer der ændres:
- `src/data/budget-constants.ts` — type `LiquidityConfig`.
- `src/hooks/use-db-state.ts` — load/save `liquidity_config` fra `settings`-tabellen; udstil `liquidityConfig` + `setLiquidityConfig`.
- `src/lib/budget-utils.ts` — nye helpers + `computeLiquiditySection(...)` der returnerer alle 7 rækker som `{ id, label, r[12], b[12] }`.
- `src/components/budget/SkatTab.tsx` — nyt "Konti & saldi"-kort med KontoPicker-multivalg + primo-input; brug de nye helpers.
- `src/components/budget/ResultatTab.tsx` — render "Likviditet & gæld"-sektion (foldbar, samme sticky-header-mønster som andre sektioner) efter `res`/`final`-rækkerne.
- `src/pages/Index.tsx` — send `liquidityConfig`, `momsBetalt`, `bskat`, `andenGeld` videre til `ResultatTab`.

Ingen DB-migration nødvendig — `settings` er allerede en key/value-tabel.

## Ikke med i denne iteration
- Ingen fremskrivning af beholdning på debitor/kreditor-konti.
- Ingen redigering af driftskonto-saldo pr. måned (kun primo).
- Ingen automatisk detektion af hvilke konti der er B-skat/gæld — brugeren vælger dem.
