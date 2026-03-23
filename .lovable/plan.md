
# Fix: Auto-moms fra kontoplan + bedre feltbredder i Fremtidige udgifter

## Hvad jeg fandt
Der er to separate årsager bag det, du beder om:

1. **Momskode kan ikke “følge med” fra kontoplanen endnu**
   - `FutureExpensesTab` har kun `acctMap` med `nr -> navn`
   - den gemte kontoplan (`chart_of_accounts`) har **ingen moms-kolonne**
   - kontoplan-importen læser godt nok moms ind i preview (`kontoPlanMeta`), men smider den væk bagefter

2. **Feltbreddene i opret-rækken er skæve**
   - nuværende grid er gjort for aggressivt smalt på dato
   - tekstfeltet sluger for meget plads
   - konto og moms er for smalle i forhold til deres faktiske indhold

## Implementeringsplan

### 1. Gem moms på kontoplan-konti
**Filer:**
- `supabase/migrations/...`
- `src/integrations/supabase/types.ts` (auto-genereres via backend)
- `src/data/budget-constants.ts`
- `src/hooks/use-db-state.ts`
- `src/components/budget/ImportTab.tsx`

**Ændringer:**
- tilføj nullable `moms`-kolonne på `chart_of_accounts`
- udvid `PLRow` med fx `moms?: string | null`
- opdatér mapping i `use-db-state`:
  - `plRowToDb` skal skrive moms
  - `dbToPlRow` skal læse moms
- opdatér kontoplan-import, så moms fra Excel faktisk bliver gemt på konto-rækkerne, ikke kun vist i preview

**Resultat:**
Valgt konto kan have en standard-momskode knyttet til sig.

### 2. Auto-udfyld moms når konto vælges i Fremtidige udgifter
**Fil:**
- `src/components/budget/FutureExpensesTab.tsx`

**Ændringer:**
- byg også et `acctMomsMap` (`nr -> moms`)
- når brugeren vælger konto i `KontoPicker`:
  - sæt `konto`
  - sæt samtidig `moms` til kontiens moms-kode, hvis den findes
  - hvis kontoen ikke har moms, sæt `moms` til `null`
- gør det både for:
  - ny række
  - redigering af eksisterende række

**Regel:**
Kontovalget bliver den styrende standard for moms. Brugeren kan stadig ændre momskoden manuelt bagefter.

### 3. Vis `-` i stedet for “Ingen”
**Fil:**
- `src/components/budget/FutureExpensesTab.tsx`

**Ændringer:**
- skift label i moms-select fra `Ingen` til `-`
- brug samme visning både i opret-række, redigering og tabelens inline-momsfelt
- behold lagring som `null` i databasen

**Resultat:**
UI matcher dit ønskede format uden at ændre datamodellen.

### 4. Rebalancér feltbredderne i opret-rækken
**Fil:**
- `src/components/budget/FutureExpensesTab.tsx`

**Ændringer:**
- justér grid’en, så den matcher bordets visuelle behov bedre:
```text
[Dato lidt bredere] [Tekst mindre bred] [Beløb cirka som nu] [Konto bredere] [Moms bredere] [+]
```
- konkret vil jeg:
  - gøre **Dato** lidt bredere end nu
  - gøre **Tekst** tydeligt mindre end nu
  - lade **Beløb** være næsten uændret
  - gøre **Konto** bredere, så nummer + navn passer bedre
  - gøre **Moms** bredere, så select ikke klemmes

### 5. Match inputbredder bedre med tabelens kolonner
**Fil:**
- `src/components/budget/FutureExpensesTab.tsx`

**Ændringer:**
- justér både:
  - add-row grid
  - edit-mode controls
  - evt. triggerbredder på `DatePicker`, `KontoPicker` og `Select`
- sørg for at dato-, konto- og momsfelter har realistiske minimumsbredder og ikke bliver presset af lange tekstfelter

## Forventet resultat
Efter ændringen vil:

- momskoden automatisk blive sat ud fra valgt konto i kontoplanen
- `-` blive vist i stedet for “Ingen”
- datofeltet blive lidt bredere
- tekstfeltet blive mindre bredt
- konto-feltet blive bredere
- moms-feltet blive bredere
- opret-rækken føles mere afbalanceret og tættere på tabellens faktiske kolonnebredder

## Filer der ændres
| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Tilføj `moms` til kontoplan-tabellen |
| `src/data/budget-constants.ts` | Udvid `PLRow` med moms |
| `src/hooks/use-db-state.ts` | Læs/skriv moms på kontoplan |
| `src/components/budget/ImportTab.tsx` | Gem moms fra importeret kontoplan |
| `src/components/budget/FutureExpensesTab.tsx` | Auto-moms ved kontovalg, `-` i stedet for “Ingen”, nye feltbredder |
