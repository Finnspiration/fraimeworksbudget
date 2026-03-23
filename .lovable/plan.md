

# Fix: Forkert opsummering i resultatopgørelsen — balancekonti medregnes

## Identificeret problem

Konto 1950 (og potentielt andre type 2-konti) er importeret som `acct`-rækker — identiske med driftskonti. Når `computePL` beregner totaler med `range:`-formler, medtager den ALLE `acct`-rækker i intervallet:

- `t2000` (Dækningsbidrag) = `range:1000-2000` → **inkluderer konto 1950**
- `t3800` (Resultat før afskr.) = `range:1000-3800` → **inkluderer konto 1950**
- `t4990` (PERIODENS RESULTAT) = `range:1000-4990` → **inkluderer konto 1950**

Men konto 1950 er IKKE med i nogen af subtotalerne (t1099 eller t1399). Så beløbet dukker op i Dækningsbidrag uden at være synligt i hverken Omsætning eller Direkte omkostninger — det er derfor tallene "ikke stemmer".

Nulkontrol-problemet: Når balancekonti med transaktioner vises/skjules, ændrer det ikke totalerne, men det gør det umuligt at afstemme de synlige konti med totallinjerne.

## Løsning

### 1. Ny kontotype `bal` til balancekonti

I `PLRow` type-definitionen tilføj `'bal'` som mulig type (ved siden af `'acct'`). Balance-konti vises stadig i kontoplanen, men deltager IKKE i P&L range-summer.

**Fil: `src/data/budget-constants.ts`** — Tilføj `'bal'` til `PLRow.t` union type.

### 2. Ekskludér `bal` fra range-beregninger

**Fil: `src/lib/budget-utils.ts`** — I `computePL`:
- Behold `bal`-rækker i `vals` (så de kan vises), men filtrér dem fra i range-summeringer:

```typescript
// Ændr i range-logik:
plRows.filter(a => a.t === 'acct' && a.nr! >= start && a.nr! <= end)
// Til (allerede ekskluderer 'bal' implicit, da vi kun filtrerer 'acct')
```

Da `bal` er en separat type, vil `a.t === 'acct'` automatisk ekskludere dem. Vi skal bare sikre at `bal`-rækker OGSÅ oprettes i `vals` (til visning):

```typescript
plRows.filter(x => x.t === 'acct' || x.t === 'bal').forEach(x => {
  vals[x.nr!] = { r: ..., b: ... };
});
```

Men i sum-logikken beholder vi `a.t === 'acct'` — balance ekskluderes.

### 3. Import: Tag type 2 som `bal`

**Fil: `src/components/budget/ImportTab.tsx`** — Ved kontoplan-import:

```typescript
} else if (type === 1 || (type === 0 && nr > 0)) {
  plRows.push({ t: 'acct', nr, lbl: navn, ... });
} else if (type === 2) {
  plRows.push({ t: 'bal', nr, lbl: navn, ... });
}
```

### 4. Resultatopgørelse: Vis `bal`-rækker korrekt

**Fil: `src/components/budget/ResultatTab.tsx`** — Tilføj rendering af `bal`-rækker ligesom `acct`-rækker, evt. med en visuel indikator (badge "Balance").

### 5. Dynamisk budget: Inkludér `bal` i beregningen

**Fil: `src/lib/budget-utils.ts`** — `computeDynamicBudget` skal også oprette budget for `bal`-rækker (til visning), selvom de ikke summeres.

### 6. Ret eksisterende data

**Database migration**: Opdatér konto 1950 (og andre type 2-konti) fra `row_type = 'acct'` til `row_type = 'bal'`:

```sql
UPDATE chart_of_accounts SET row_type = 'bal' WHERE nr = 1950;
```

Plus alle andre konti i balance-sektionerne (5xxx, 6xxx, etc.) der allerede korrekt har høje numre uden for P&L-intervallet — men det gøres bedst ved at genimportere kontoplanen efter kode-fixet.

## Filer der ændres

| Fil | Ændring |
|---|---|
| `src/data/budget-constants.ts` | Tilføj `'bal'` til PLRow type |
| `src/lib/budget-utils.ts` | `computePL`: opret vals for `bal`, ekskludér fra range-summer. `computeDynamicBudget`: inkludér `bal`. |
| `src/components/budget/ImportTab.tsx` | Type 2 → `bal` i stedet for `acct` |
| `src/components/budget/ResultatTab.tsx` | Render `bal`-rækker (som acct, evt. med badge) |
| `src/hooks/use-db-state.ts` | `dbToPlRow` håndterer `bal` korrekt (allerede OK — det er bare en string) |
| Database migration | Ret eksisterende type 2-konti til `row_type = 'bal'` |

