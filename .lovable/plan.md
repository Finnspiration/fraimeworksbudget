

# Link konto i kassekladden til kontoplanen

## Koncept
Når brugeren redigerer et kontonummer i kassekladden, skal der vises en dropdown med kontonumre fra den aktive kontoplan (customPL eller PL) i stedet for et frit tal-input. Derudover vises kontonavnet ved siden af nummeret i kassekladden.

## Ændringer

### 1. Konto-dropdown ved redigering (`ImportTab.tsx`)
- Erstat `<input type="number">` med en dropdown/select der viser alle `acct`-rækker fra `activePL`
- Hver option viser `nr — lbl` (f.eks. "1010 — Salg af varer/ydelser m/moms")
- Søgbar dropdown med filtrering på nr og navn
- Fallback: hvis kontoen ikke findes i planen, vis den stadig (rød markering)

### 2. Vis kontonavn i kassekladde-tabellen (`ImportTab.tsx`)
- Ved siden af kontonummeret, vis kontonavnet fra den aktive kontoplan som tooltip eller lille tekst
- Konti der ikke matcher kontoplanen markeres visuelt (f.eks. orange/rød)

### 3. Validering
- Ved import af kassekladde: marker posteringer med kontonumre der ikke findes i kontoplanen
- Giver brugeren overblik over posteringer der skal rettes

### 4. Props
- `activePL` er allerede tilgængelig via `customPL` prop — udled kontoliste fra `customPL ?? PL`

