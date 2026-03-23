

# Fix: Budget-værdier tydeligere + synlig hover-indikator

## Problemer

1. **Budget-celler med tooltip har næsten usynlig hover-indikator** — `border-dotted border-current` er svær at se fordi budget-farven (`text-foreground/50` / `text-[hsl(142,40%,35%)]`) allerede er lys
2. **Budget-tal er for afdæmpede** — `text-foreground/50` (negative) og `text-[hsl(142,40%,35%)]` (positive) er for lyse

## Løsning

### Fil: `src/components/budget/CellWithTooltip.tsx`

**1. Mørkere budget-farver:**
- Negative budget: `text-foreground/50` → `text-destructive/70` (rødlig men afdæmpet ift. realiseret)
- Positive budget: `text-[hsl(142,40%,35%)]` → `text-[hsl(142,35%,30%)]` (mørkere grøn)

**2. Synlig hover-indikator på budget-celler:**
- Tilføj stærkere border-styling for budget-celler: `border-b border-dotted border-foreground/40` i stedet for `border-current` (som arver den svage farve)

### Fil: `src/components/budget/ResultatTab.tsx`

**Samme farveændringer i `Cell`-komponenten** (linje 25-27), så ikke-tooltip celler også får mørkere budget-farver.

| Fil | Ændring |
|---|---|
| `src/components/budget/CellWithTooltip.tsx` | Mørkere budget-farver, stærkere hover-border |
| `src/components/budget/ResultatTab.tsx` | Samme farveændringer i Cell-komponenten |

