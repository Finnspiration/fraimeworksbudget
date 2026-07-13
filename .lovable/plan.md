## Problem

Konto 6138 er valgt som B-skat-konto, og der er en realiseret postering på 15.000 kr d. 9. juli 2026. `nReal` er sat til 6 (juni), så juli-transaktionen falder efter "realiserede måneder"-grænsen.

I `computeLiquiditySection` / render-koden i `ResultatTab.tsx` bliver realiserede rækker behandlet som "budget-territorium" når `i >= nReal`:

- `Cell` for r-kolonnen bruger `dimmed={i >= nReal}` → værdien 15.000 vises med `opacity-30` og fremstår usynlig.
- YTD-R summer kun `sumArr(row.r, 0, nReal - 1)` → juli-beløbet tælles ikke med i totalen.
- Proj beregnes som `ytdR * 12 / nReal`, hvilket ignorerer faktiske posteringer efter `nReal`.
- `driftR[i] = i < nReal ? accR : 0` → driftskonto-saldoen nulstilles efter nReal, selv om der er reelle bevægelser.

Realiserede posteringer på likviditets-/gældskonti eksisterer helt naturligt efter `nReal` (fx moms betalt kvartalsvis, B-skat pr. rate). De skal altid tælle som realiserede.

## Fix

### `src/lib/budget-utils.ts` (`computeLiquiditySection`)

- Fjern `i < nReal`-gate på driftskonto. Byg `driftR` som en løbende saldo hen over alle 12 måneder ud fra reelle cash-flow-poster (r-siden). Efter sidste måned med realiseret aktivitet vises budgetteret saldo i b-rækken; r-rækken viser saldo t.o.m. seneste måned med aktivitet.
- Fjern `nReal`-parameteren fra driftskonto-logikken (den beholdes kun til budget-fremskrivning hvis nødvendigt).

### `src/components/budget/ResultatTab.tsx` (`liqSection` render)

- For hver likviditets-række:
  - r-cellen: `dimmed=false` (realiseret data er realiseret uanset måned). Vis '–' når `r[i] === 0`.
  - b-cellen: behold `dimmed={i < nReal}` — matcher P&L-mønsteret (budget for realiserede måneder dæmpes).
- YTD-R = `sumArr(row.r)` (fuld sum af realiseret aktivitet).
- YTD-B = `sumArr(row.b, 0, nReal - 1)` uændret.
- Proj = `sumArr(row.r) + sumArr(row.b, nReal, 11)` — samme hybrid-formel som resten af P&L bruger.
- Årsbudget (yrB) uændret.

### Konsistens med P&L

Denne opdatering aligner likviditets-sektionen med den nye "hybrid" projektionsmodel (realized + budget) som allerede bruges i `res`-rækken og Overblik-fanen.

## Ikke med
- Ingen ændringer af `SkatTab`-konfigurationen.
- Ingen ændringer af hvordan budget-momsen/B-skat-raterne beregnes.
- Ingen ændringer af db-skemaet.
