

# Sortering + opsummerings-fix i Fremtidige Udgifter

## 1. Kolonne-sortering

### Fil: `src/components/budget/FutureExpensesTab.tsx`

**Ny state:**
```tsx
const [sortCol, setSortCol] = useState<'dato' | 'tekst' | 'belob' | 'konto' | 'moms' | 'status' | null>('dato');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
```

**Sorterings-logik:** Udvid `filtered` med `.sort()` baseret på `sortCol`/`sortDir` — sammenlign strenge for tekst/dato/moms, tal for beløb/konto, og boolean for status (matched).

**UI:** Gør hver `<th>` klikbar med en `onClick` handler der toggler retning (eller skifter kolonne). Vis en lille pil-indikator (▲/▼) ved aktiv sorteringskolonne.

## 2. Opsummeringer ekskluderer matchede

Koden ekskluderer allerede matchede udgifter fra 7/30-dages opsummeringerne (linje 351: `if (e.matched || !e.dato) continue`). **Ingen ændring nødvendig her** — det virker korrekt.

### Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Sorteringsstate, sorteret `filtered`, klikbare kolonnehoveder med pil-indikator |

