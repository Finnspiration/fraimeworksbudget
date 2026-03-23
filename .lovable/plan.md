
# Fix: Type 2-balancekonti bliver stadig filtreret fra

## Årsag

Jeg fandt den konkrete fejl i `src/components/budget/ImportTab.tsx`:

```ts
if (type === 2) continue;
```

Den linje kører **før** logikken, der ellers forsøger at importere `type === 2` som `acct`. Derfor bliver alle balancekonti stadig droppet ved genimport, og konto 1950 ender rød i kassekladden igen.

Derudover blev den manuelt indsatte 1950-række fjernet, fordi kontoplan-importen erstatter hele den gemte kontoplan.

## Plan

### 1. Ret importlogikken for kontoplan
I `src/components/budget/ImportTab.tsx`:

- Fjern den tidlige filtrering af `type === 2`
- Behold/importér type 2 i samme gren som øvrige konti:
  - `type === 1` = drift
  - `type === 2` = balance
  - `type === 0 && nr > 0` = fallback-konto

Det sikrer, at balancekonti som 1950 faktisk bliver oprettet som `acct`-rækker i den importerede kontoplan.

### 2. Opdatér hjælpeteksten under kontoplan
Skift teksten fra:

```text
Importér kontoplan fra Excel. Format: Nr, Navn, Type (1=Drift, 3=SumFra, 4=Overskrift, 5=Overskrift Start, 6=SumInterval), Sumfra.
```

til:

```text
Importér kontoplan fra Excel. Format: Nr, Navn, Type (1=Drift, 2=Balance, 3=SumFra, 4=Overskrift, 5=Overskrift Start, 6=SumInterval), Sumfra.
```

### 3. Ret validerings-/statusbesked
Opdatér den fejltekst der i dag siger:

```text
Ingen driftskonti (type 1) fundet i filen
```

så den matcher den nye logik, fx:

```text
Ingen konti (type 1 eller 2) fundet i filen
```

så UI’et ikke misinformerer, når en fil indeholder balancekonti.

### 4. Verificér konsekvensen for eksisterende import
Efter fixet vil næste kontoplan-import gemme type 2-konti korrekt i backend, så konto 1950 og andre balancekonti ikke længere markeres rødt i kassekladden, når de findes i filen.

## Filer der ændres

| Fil | Ændring |
|---|---|
| `src/components/budget/ImportTab.tsx` | Fjern `if (type === 2) continue;`, behold type 2 som `acct`, opdatér hjælpetekst og statusbesked |

## Teknisk note

Den relevante fejl er, at disse to stykker kode modsiger hinanden:

```ts
if (type === 2) continue;
```

og senere:

```ts
} else if (type === 1 || type === 2 || (type === 0 && nr > 0)) {
  plRows.push({ t: 'acct', nr, lbl: navn, grp: currentGrp });
}
```

Første linje gør, at anden linje aldrig nås for type 2. Det er den primære root cause.
