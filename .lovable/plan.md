

# Tilføj U25 moms-redigering og dato-filtrering

## Ændringer

### 1. Redigerbar moms-kolonne i kassekladden (`ImportTab.tsx`)
- Gør moms-cellen klikbar (samme inline-edit mønster som konto)
- Dropdown/input med valgmulighederne: `I25`, `U25`, eller tom (ingen moms)
- Bruges til manuelt at tilføje U25 på salgsfakturaer efter import

### 2. Dato-filter i kassekladden (`ImportTab.tsx`)
- Tilføj to dato-inputs (fra/til) i filterrækken
- Filtrér posteringer baseret på dato-range
- Nulstil-knap for at fjerne datofilter

### 3. Opdater moms-filter dropdown (`ImportTab.tsx`)
- Tilføj `U25` som filtreringsmulighed (ud over `I25` og `Ingen moms`)

### 4. Opdater SkatTab salgsmoms-beregning (`SkatTab.tsx`)
- Beregn salgsmoms fra transaktioner med `moms === 'U25'` i stedet for P&L-approksimation
- Fallback til gammel metode hvis ingen U25-transaktioner findes

### 5. Opdater netBelob i `budget-utils.ts`
- Håndter `U25` ligesom `I25`: `belob / 1.25` for korrekt nettobeløb i P&L

