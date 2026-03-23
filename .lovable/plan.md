

# Fix: Layout-justering af "tilføj ny"-formularen i Fremtidige udgifter

## Problemer (fra screenshot)

1. **Dato-kolonnen er for bred** (90px) — datovælger-knappen behøver kun ~75px
2. **Tekst-feltet er for smalt** — skal have mere plads
3. **Dato-popover overlapper** tekst-inputfeltet pga. z-index/stacking

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

**1. Grid-layout:** Ændr `grid-cols-[90px_1fr_90px_180px_60px_40px]` → `grid-cols-[75px_1fr_80px_160px_55px_36px]` — dato og beløb smallere, konto lidt smallere, tekst får resten.

**2. DatePicker z-index:** Tilføj `z-50` på `PopoverContent` i DatePicker-komponenten så kalenderen altid vises over andre felter.

**3. DatePicker bredde:** Giv DatePicker-knappen en fast `w-[75px]` og vis kortere dato (`dd/MM/yy` eller bare `yyyy-MM-dd` som i tabellen).

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Juster grid-kolonner, tilføj z-index på DatePicker popover, smallere dato-knap |

