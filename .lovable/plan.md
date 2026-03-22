

# Budget-tal på bar chart + mørkere budget-farver i resultatopgørelse

## 1. Bar chart: Tilføj budgetteret omsætning og udgifter

I `src/components/budget/OverblikTab.tsx`:

- Udvid `chartData` med to nye felter: `'Budget oms.'` (omsætningsbudget pr. måned) og `'Budget udg.'` (sum af udgiftskonti-budget pr. måned)
- Tilføj to nye `<Bar>` i BarChart med svagere/lysere farver (opacity 0.3) af de eksisterende farver
- Placér budget-bars bag de realiserede bars (før i JSX-rækkefølgen)

```
Budget oms.: omsRow?.b[i] || 0
Budget udg.: sum af expenseAcctRows budget for måned i (Math.abs)
```

Farver:
- Budget omsætning: `hsl(var(--budget-positive))` med `fillOpacity={0.3}`
- Budget udgifter: `hsl(var(--destructive))` med `fillOpacity={0.3}`

## 2. Mørkere budget-tal i ResultatTab

I `src/components/budget/ResultatTab.tsx`:

- I `Cell`-komponenten: budget-værdier (ikke `realized`) bruger i dag `text-[hsl(var(--budget-positive))]` og `text-muted-foreground`. Ændr til mørkere varianter:
  - Positive budget: `text-[hsl(142,40%,35%)]` (mørkere grøn)
  - Negative budget: `text-muted-foreground` (behold)
- I total/res/final-rækker: budget-kolonnen bruger `text-muted-foreground` — ændr til en lidt mørkere farve som `text-foreground/60`

## Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/OverblikTab.tsx` | Tilføj budget-bars i chartData + BarChart |
| `src/components/budget/ResultatTab.tsx` | Mørkere farver for budget-tal i Cell og total-rækker |

