

# Fix: Fjern Nulkontrol og duplikeret PERIODENS RESULTAT fra resultatopgørelsen

## Problem

Den importerede kontoplan indeholder en fuld balance efter resultatopgørelsen (konti 5000-9990). I bunden af resultatopgørelsen vises:

1. **PERIODENS RESULTAT** (t4990, `range:1000-4990`) — korrekt P&L-resultat
2. Hele balancen (aktiver, passiver, gæld) — hører ikke hjemme her
3. **Nulkontrol** (t9990, `range:1000-9990`) — bogføringsmæssig kontrolpost der summer alt inkl. balance
4. **PERIODENS RESULTAT** igen (final, `id:t9990`) — peger på Nulkontrol, gentager beløbet

Resultatopgørelsen skal stoppe efter den rigtige "PERIODENS RESULTAT" (t4990). Alt derefter er balance/kontrol og hører ikke til P&L-visningen.

## Løsning

### Fil: `src/components/budget/ResultatTab.tsx`

Filtrér `activePL` så resultatopgørelsen kun viser rækker der hører til P&L-delen. To ændringer:

1. **Stop rendering efter den første `final`-række ELLER efter PERIODENS RESULTAT (t4990)**:
   - I `rows` useMemo: tilføj en `stopRendering`-flag. Når vi rammer en `total`-række med id `t4990` (eller den auto-genererede `final`-række), stop med at rendere efterfølgende rækker.
   
2. **Alternativt (renere)**: Filtrér `activePL` inden rendering — afskær alt efter den rigtige P&L-slutlinje. Opret en `plForDisplay` memo der finder indekset af rækken med `id === 't4990'` og klipper listen der.

Jeg anbefaler tilgang 2 — den er simplere og mere robust:

```typescript
const plForDisplay = useMemo(() => {
  // Find the real P&L result row (PERIODENS RESULTAT = range:1000-4990)
  const endIdx = activePL.findIndex(r => r.id === 't4990');
  if (endIdx >= 0) return activePL.slice(0, endIdx + 1);
  // Fallback: find first 'final' row
  const finalIdx = activePL.findIndex(r => r.t === 'final');
  if (finalIdx >= 0) return activePL.slice(0, finalIdx + 1);
  return activePL;
}, [activePL]);
```

Brug derefter `plForDisplay` i stedet for `activePL` i `visibleSections` og `rows` useMemo.

### Konsekvens

- Resultatopgørelsen viser konti 1000-4990 (omsætning → PERIODENS RESULTAT)
- Balance (5000+), Nulkontrol (9990) og den duplikerede final-række vises ikke
- Ingen data ændres — det er kun et visuelt filter i `ResultatTab`

| Fil | Ændring |
|---|---|
| `src/components/budget/ResultatTab.tsx` | Tilføj `plForDisplay` memo der afskærer balance-rækker. Brug den i stedet for `activePL` i rendering. |

