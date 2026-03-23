
# Fix: budget-hover skal være lige så tydelig som realiseret

## Årsag
Problemet er ikke kun farven på budget-tallet. I `CellWithTooltip` bliver fremtidige/dæmpede budgetceller stadig rendret med `opacity-30` på hele `<td>`-elementet. Derfor bliver selve hover-kortet også nedtonet. Samtidig renderes `HoverCardContent` i dag uden portal, så det bliver mere sårbart over for tabelens stacking/opacity.

## Løsning

### 1. Render hover-kortet i en portal
**Fil:** `src/components/ui/hover-card.tsx`

- wrap `HoverCardPrimitive.Content` i `HoverCardPrimitive.Portal`
- behold høj z-index, så kortet altid ligger tydeligt over tabellen

Det gør hover-kortet visuelt isoleret fra cellens opacity og layout.

### 2. Dæmp kun budget-tallet — ikke tooltippen
**Fil:** `src/components/budget/CellWithTooltip.tsx`

- fjern `opacity-30` fra `<td>` for celler med tooltip
- læg i stedet dæmpningen på selve triggeren (`span`) eller en indre wrapper
- behold de mørkere budgetfarver, så budget stadig er afdæmpet i forhold til realiseret, men ikke udvasket

### 3. Gør hover-indikatoren tydelig også på budget-celler
**Fil:** `src/components/budget/CellWithTooltip.tsx`

- styrk triggerens visuelle indikator for budget-celler
- brug en tydelig underline/border og evt. let hover-bg eller mørkere dotted line, så det er lige så oplagt som ved realiserede værdier at der findes en breakdown

## Resultat
- breakdown-popup for budget-celler bliver fuldt synlig
- hover føles lige så tydelig som på realiserede værdier
- budgettal forbliver lidt mere afdæmpede end realiserede, men tooltippen bliver ikke næsten usynlig

| Fil | Ændring |
|---|---|
| `src/components/ui/hover-card.tsx` | Render hover-kort i portal med sikker layering |
| `src/components/budget/CellWithTooltip.tsx` | Flyt dimning fra cellen til triggeren og gør hover-indikatoren tydeligere |
