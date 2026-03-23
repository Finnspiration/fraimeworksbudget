

# Tre forbedringer: Konto-dropdown, foldet import, og celle-tooltip i resultatopgørelsen

## 1. Konto-dropdown i Fremtidige udgifter

**Fil: `src/components/budget/FutureExpensesTab.tsx`**

Erstat `<Input type="number">` for konto med en searchable Combobox (Command + Popover), der viser alle konti fra `acctMap` med nr + navn. Gælder både "tilføj ny"-formularen og inline-redigering.

Mønsteret bruges allerede i `ImportTab.tsx` (se `kontoPopoverOpen` + Command-komponent der). Genanvend samme tilgang.

## 2. Kontoplan og kassekladde-import foldet ind som default

**Fil: `src/components/budget/ImportTab.tsx`**

Wrap de to Card-sektioner (Kontoplan + Kassekladde) i Collapsible-komponenter med `defaultOpen={false}`. Brug `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` fra shadcn. CardHeader bliver trigger med en chevron-ikon.

## 3. Hover-tooltip på celler i resultatopgørelsen

**Fil: `src/components/budget/ResultatTab.tsx`**

### For `acct`-rækker (individuelle konti):
Celleværdien (realiseret) kommer fra transaktioner. For at vise detaljer skal `ResultatTab` modtage `txns` som ny prop. Ved hover på en realiseret celle, vis en tooltip med de individuelle posteringer der bidrager til værdien (filtreret på konto + måned): dato, tekst, beløb (netto).

For budgetceller: vis kilderne — fast budget, pipeline-bidrag og fremtidige udgifter der bidrager til den måned+konto.

### For `total`/`res`/`final`-rækker (summer):
Vis de individuelle konti/subtotaler der summer op til værdien, med deres respektive beløb for den pågældende måned.

### Implementation:
- Tilføj `txns: Transaction[]` prop til `ResultatTab`
- Opdatér `Index.tsx` til at sende `txns={state.txns}`
- Opret en `CellWithTooltip`-komponent der wrapper celler med `HoverCard` (bedre end tooltip, da den kan vise mere indhold)
- For realiserede acct-celler: filtrér `txns` på konto + måned, vis liste
- For budget acct-celler: vis fast budget + pipeline + future expenses bidrag
- For total-rækker: dekomponér `sum`-formlen og vis bidrag fra hver underliggende konto/subtotal
- Brug `HoverCardContent` med en lille tabel over bidragene

### Props-ændring i Index.tsx:
Tilføj `txns={state.txns}` og `pipelineJobs={pipelineJobs}` og `futureExpenses={activeExpenses}` til ResultatTab for at kunne vise alle kilder i tooltip.

## Filer der ændres

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Erstat konto-input med searchable dropdown |
| `src/components/budget/ImportTab.tsx` | Wrap kontoplan + kassekladde i Collapsible, default lukket |
| `src/components/budget/ResultatTab.tsx` | Tilføj txns/pipeline/futureExpenses props, HoverCard på celler |
| `src/pages/Index.tsx` | Send ekstra props til ResultatTab |

