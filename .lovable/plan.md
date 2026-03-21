

# Fix: Forkerte sumformler i importeret kontoplan

## Problem

Kontoplanens import-logik (type 3 = SumFra) tildeler altid den **seneste gruppes** konti til en sumrække. Men i dansk regnskab betyder "SumFra" at man summerer alle konti **fra et startnummer til det aktuelle nummer**. Det giver tre kritiske fejl:

1. **"Dækningsbidrag" (nr 2000)** har `sum: grp:grp3` — den summer kun direkte omkostninger. Den burde summere alle konti fra 1010-2000 (omsætning + direkte omk.)
2. **"Resultat før afskrivninger" (nr 3800)** har `sum: grp:grp9` — den summer kun administrationsomkostninger. Den burde summere konti 1010-3800
3. Samme fejl gentager sig for "Resultat før renter", "Resultat før ekstraordinære poster" og "PERIODENS RESULTAT" — de summer alle kun deres lokale gruppe i stedet for det kumulative interval
4. **Final-rækken** summerer alle `res`-rækker, som selv indeholder overlappende totaler → dobbelt-tælling

## Årsag

I `ImportTab.tsx` linje 247-251: type 3-rækker får altid `sum: grp:${currentGrp}`. Sumfra-kolonnen fra Excel ignoreres helt.

## Løsning

### 1. Tilføj `range:from-to` sumtype til `computePL` (`budget-utils.ts`)

Udvid sum-parser til at forstå `range:1010-2000`, som summerer alle `acct`-rækker med `nr` i intervallet [1010, 2000].

```text
// Ny sum-type i computePL:
range:1010-2000  →  sum alle acct med nr >= 1010 og nr <= 2000
```

### 2. Fix kontoplan-import (`ImportTab.tsx`)

For type 3 (SumFra) rækker:
- Læs Sumfra-kolonnen (allerede parset men ubrugt)
- Hvis Sumfra er udfyldt: brug `range:${sumfra}-${nr}` som sum-formel
- Hvis Sumfra er tom: fald tilbage til `grp:${currentGrp}` (for simple gruppesubtotaler)

### 3. Opdatér eksisterende data i databasen (migration)

Ret de forkerte sum_formula-værdier for de kumulative totaler:

| Konto | Nuværende | Korrekt |
|---|---|---|
| Dækningsbidrag (2000) | `grp:grp3` | `range:1010-2000` |
| Resultat før afskr. (3800) | `grp:grp9` | `range:1010-3800` |
| Resultat før renter (4000) | `grp:grp10` | `range:1010-4000` |
| Resultat før ekstraord. (4500) | `grp:grp12` | `range:1010-4500` |
| PERIODENS RESULTAT (4990) | `grp:grp13` | `range:1010-4990` |

Plus fix `res`- og `final`-rækkerne der summer alle totaler inkl. dobbelt-tælling.

### 4. Filer der ændres

| Fil | Ændring |
|---|---|
| `src/lib/budget-utils.ts` | Tilføj `range:from-to` parsing i `computePL` |
| `src/components/budget/ImportTab.tsx` | Brug Sumfra-kolonne til range-baserede sum-formler |
| Database migration | Ret eksisterende forkerte sum_formula-værdier |

