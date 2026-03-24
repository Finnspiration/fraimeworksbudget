

# Sticky kolonner + padding i resultatopgørelsen

## Ændringer

### Fil: `src/components/budget/ResultatTab.tsx`

**1. Gør Nr. og Navn-kolonnerne sticky (vandret scroll)**

Tilføj `sticky left-0` på den første kolonne (Nr.) og `sticky left-[48px]` på den anden kolonne (Navn) — både i `thead` og alle `tbody`-rækker. Begge skal have `bg-card z-20` for at dække indholdet bag dem ved scroll.

Berørte steder:
- Thead: linje 263-264 (header-rækken), linje 276 (sub-header)
- Account rows: linje 162-163
- Total/res/final rows: linje 207-208
- Section rows: linje 143 (colSpan-cellen)

Hver sticky-kolonne får:
- Kolonne 1 (Nr.): `sticky left-0 z-20 bg-card`
- Kolonne 2 (Navn): `sticky left-[48px] z-20 bg-card`

For total/res/final-rækker tilpasses `bg-card` til den relevante baggrund (fx `bg-primary/10`, `bg-secondary/50`).

**2. Tilføj padding til højre**

Tilføj `pr-8` (eller `pr-12`) på tabellens wrapper-div (linje 259) eller på den sidste kolonne i hver række, så den sidste kolonne ikke overskygges af navigationsbar.

Simpelste løsning: tilføj `pr-8` på `<table>` eller en ekstra tom kolonne til sidst.

| Fil | Ændring |
|---|---|
| `src/components/budget/ResultatTab.tsx` | Sticky left på de to første kolonner + right padding |

