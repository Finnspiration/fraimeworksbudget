# Fix: Budgetterede udgifter (lønninger m.fl.) vises som positive beløb

## Problem
I "Fast budget"-mode viser budget-cellerne udgiftsbeløb som **positive** tal (fx Lønninger - Charlotte: `25.000` i grønt), selvom de er gemt korrekt som negative (`-25000`) og er udgifter. Det er inkonsistent med:
- Realiserede tal i samme række, der vises som negative i rødt (`-50.000`)
- Subtotaler ("Lønninger i alt"), der vises som `-30.000` i rødt
- Forventning: udgifter er negative

## Årsag
I `src/components/budget/ResultatTab.tsx`:

1. **`EditableBudgetCell`** (linje 70-73) flipper bevidst fortegn for visning:
   ```ts
   const displayValue = isExpense ? -value : value;
   ```
   → en gemt værdi `-25000` vises som `25000` i grøn (positiv-farve).

2. **`FixedBudgetCell`** (linje 88-96) viser future-expense-værdier med `Math.abs(futureValue)`, hvilket strip'er minustegn fra udgifter.

Dette blev oprindeligt indført for at gøre indtastning "intuitiv" (jf. memory `logic/budget-entry-signs`), men gør at visningen modsiger virkeligheden og er inkonsistent med både realiserede celler og subtotaler.

## Løsning
Vis altid den faktisk gemte værdi (med korrekt fortegn) — men behold **input-flow** så brugere kan indtaste positive tal, der automatisk gemmes som negative for udgiftskonti.

### Ændringer i `src/components/budget/ResultatTab.tsx`

**`EditableBudgetCell` (visningsdelen, linje 70-83):**
- Fjern fortegns-flip: brug `value` direkte i stedet for `displayValue = isExpense ? -value : value`
- Farvelogik følger faktisk værdi: negative → rød/dæmpet, positive → grøn
- Behold input-konverteringen i `handleSave` (linje 42-49) uændret, så brugere stadig kan skrive `25000` og få det gemt som `-25000`
- Behold `Math.abs(value)` i `setDraft` (linje 78) så input-feltet starter med positivt tal ved redigering
- Opdatér tooltip-tekst til fx: `"Udgiftskonto – indtast positivt tal, gemmes som negativt"`

**`FixedBudgetCell` (linje 88-96):**
- Fjern `Math.abs(futureValue)` — vis `fmt(futureValue)` direkte så `-3000` vises som `-3.000`
- Farvelogikken er allerede korrekt baseret på fortegn

## Resultat
- Lønninger - Charlotte Bud: `-25.000` (rød/dæmpet) i stedet for `25.000` (grøn)
- Konsistens mellem real-, budget- og total-celler
- Indtastning forbliver intuitiv: bruger skriver `25000`, systemet gemmer `-25000` for udgiftskonti

## Fil
| Fil | Ændring |
|---|---|
| `src/components/budget/ResultatTab.tsx` | Fjern visningsflip i `EditableBudgetCell` + `FixedBudgetCell`; behold input-konvertering |
