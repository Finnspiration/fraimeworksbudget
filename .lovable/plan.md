
# Fix: Datofeltet i Fremtidige udgifter er stadig ikke løst

## Hvad jeg kan se
Problemet er reelt stadig der. I den aktuelle kode er grid’en godt nok ændret, men selve datovælger-knappen er ikke gjort kompakt nok, så dens indhold flyder ud over kolonnen. Det er derfor den stadig ser for bred ud og visuelt kolliderer med tekstfeltet.

## Årsag
I `src/components/budget/FutureExpensesTab.tsx` er der stadig tre ting, der holder layoutet forkert:

1. `DatePicker`-triggeren viser stadig lang tekst og har ikke hård bredde/truncate
2. Grid-cellerne mangler `min-w-0`, så indhold kan presse sig ud af kolonnen
3. Popoveren er kun hævet med `z-50`, men ikke gjort eksplicit kompakt/forankret nok til at undgå den oplevede overlap

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

### 1. Gør DatePicker-triggeren faktisk smal
Opdatér `DatePicker` så knappen bliver:
- `w-full`
- `min-w-0`
- mindre horizontal padding
- tekst med `truncate`

Og gør label kortere:
- placeholder: `Dato`
- valgt dato: kompakt visning i triggeren, men behold selve værdien gemt som `yyyy-MM-dd`

Det er den vigtigste del af fixet.

### 2. Gør første kolonne smallere og tekstkolonnen bredere
Skift add-row grid’en fra den nuværende faste fordeling til en, hvor dato tager mindre plads og tekst får resten, fx:
```text
[smal dato] [fleksibel tekst] [beløb] [konto] [moms] [plus]
```

Samt tilføj `min-w-0` på grid-items for dato, tekst og konto, så ingen controls kan “skubbe” sig ud over deres kolonne.

### 3. Sørg for at popoveren lægger sig tydeligt over felterne
Stram `DatePicker`-popoveren op med:
- højere z-index end nu
- eksplicit `side="bottom"`
- `align="start"`
- lidt `sideOffset`

Hvis nødvendigt sætter jeg også add-form wrapperen til `overflow-visible`, så kalenderen ikke visuelt bliver klemt.

### 4. Ret også edit-mode
Det samme problem findes i inline-redigering, hvor edit-date stadig bruger en for bred dato-control (`w-24`). Den skal gøres kompakt med samme DatePicker-styling som i “tilføj ny”.

## Resultat
Efter ændringen vil:
- datofeltet blive synligt smallere
- tekstfeltet få mere plads
- datovælgeren ikke længere se ud til at overlappe beskrivelse-feltet
- add-form og edit-form få samme kompakte dato-layout

## Fil der ændres
| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Kompakt DatePicker-trigger, smallere datokolonne, bredere tekstkolonne, `min-w-0` på grid-items, stærkere popover-positionering, samme fix i edit-mode |
