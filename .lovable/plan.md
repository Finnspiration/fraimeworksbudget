

# Fix: Faktura og Modkonto vises ikke ved import

## Problem
Kolonne-matching i parseren har bugs der forhindrer korrekt identifikation af "Faktura" og "Modkonto" headers.

## Root cause
- `col('konto')` bruger `includes('konto')` som potentielt kan matche "modkonto" afhængigt af kolonne-rækkefølge
- `cFaktura` bruger `h === 'fak'` (exact match) i stedet for `h.includes('fak')` — fanger ikke variationer
- `cModkonto` redundant check, men kan fejle ved variationer i header-navne

## Ændringer (`ImportTab.tsx`)

### 1. Fix kolonne-matching for Konto
- Ændr `col('konto')` til eksakt match: `h === 'konto'` for at undgå at "modkonto" matcher
- Alternativt: match "konto" men IKKE "modkonto" via `h === 'konto' || (h.includes('konto') && !h.includes('mod'))`

### 2. Fix kolonne-matching for Faktura
- Ændr fra `h === 'fak'` til `h.includes('fak')` så variationer som "fak.", "fak.nr" osv. også matcher

### 3. Fix kolonne-matching for Modkonto
- Udvid til også at matche "mod", "mod.konto", "modkto" variationer

### 4. Tilføj console.log til debugging (midlertidigt)
- Log detekterede kolonne-indekser ved import, så problemer er lettere at spotte

Alle ændringer sker i `src/components/budget/ImportTab.tsx`, kun i parsing-sektionen (linje 66-71).

