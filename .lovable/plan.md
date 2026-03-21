

# Skjul tomme total/res/final-rækker i Resultatopgørelse

## Problem

Kun `sec`-overskrifter og `acct`-rækker filtreres af `visibleSections`. Total-, res- og final-rækker (f.eks. "Afskrivninger i alt", "Resultat før renter", "Indretning af lejede lokaler i alt") vises stadig med kun "–" værdier, fordi de aldrig tjekkes for data.

## Løsning

### `src/components/budget/ResultatTab.tsx`

I `rows`-beregningen (linje 152-180), tilføj data-check for `total`/`res`/`final`-rækker:

1. Efter `const v = pl[row.id!]`, tjek om rækken har nogen ikke-nul værdier
2. Hvis `!showZero` og alle værdier i `v.r` og `v.b` er 0, returner `null`
3. Derudover: skjul `total`-rækker der tilhører en skjult sektion (brug `curSec` + `visibleSections`)

Konkret tilføjes efter linje 157 (`if (!v) return null;`):
```typescript
if (!showZero) {
  const hasData = v.r.some(x => x !== 0) || v.b.some(x => x !== 0);
  if (!hasData) return null;
}
```

Dette sikrer at alle rækketyper — inkl. subtotaler, resultater og finaler — skjules når de kun indeholder nulværdier.

