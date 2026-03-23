
# Fix: Momskode i Fremtidige udgifter

## Analyse

Jeg har gennemgået både UI-koden og de gemte data:

- `future_expenses.moms` findes i databasen og bliver allerede læst/skrevet i hooken
- Tabellen viser `—`, når `moms` er `null`
- De aktuelle rækker i databasen har faktisk `moms = null`, så problemet er ikke kun visning — værdien er slet ikke gemt på de eksisterende poster
- I `FutureExpensesTab` bruges der stadig et frit tekstfelt til moms, mens kassekladden bruger en tydelig valg-liste (`Ingen / I25 / U25`)

Det mest sandsynlige problem er derfor, at momsfeltet i Fremtidige udgifter er for løst og uklart, så værdien ikke bliver sat konsekvent nok på nye og eksisterende rækker.

## Løsning

### 1. Gør momskode-feltet identisk med kassekladden
**Fil:** `src/components/budget/FutureExpensesTab.tsx`

Erstat moms-`Input` med en rigtig dropdown/select med faste værdier:

- Ingen
- I25
- U25

Det gælder både:
- rækken til oprettelse af ny fremtidig udgift
- redigering af en eksisterende post

Så undgår vi fritekst, stavefejl og tomme værdier forklædt som udfyldte felter.

### 2. Gør moms nem at rette direkte på eksisterende poster
**Fil:** `src/components/budget/FutureExpensesTab.tsx`

Tilføj hurtig redigering af moms i tabelrækkerne, så brugeren kan rette de nuværende `null`-poster uden at skulle genskabe dem.

Bedste løsning her er at lade moms-cellen fungere som i kassekladden:
- klik på moms-cellen
- vis lille dropdown
- gem straks valgt kode

Det er hurtigere end fuld rækkereigering og passer til problemet her.

### 3. Normalisér værdien konsekvent ved gem
**Fil:** `src/components/budget/FutureExpensesTab.tsx`

Sørg for at værdien altid sendes som:
- `null` når der vælges “Ingen”
- `"I25"` eller `"U25"` når der vælges en kode

Så vi undgår blandede tomme strenge og inkonsistent lagring.

### 4. Bevar momskode ved kopiering
**Fil:** `src/components/budget/FutureExpensesTab.tsx`

Verificér og fasthold at “kopiér X måneder frem” altid kopierer `moms` med over på de nye rækker.

Koden ser allerede ud til at gøre det, men jeg vil eksplicit sikre at den bruger den normaliserede værdi.

## Resultat efter fix

- Momskode bliver valgt på samme måde som i kassekladden
- Nye fremtidige udgifter gemmer moms korrekt
- Eksisterende rækker med manglende moms kan hurtigt rettes direkte i listen
- Kopierede fremtidige udgifter beholder momskoden
- Ingen databaseændringer er nødvendige

## Filer

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Erstat moms-fritekst med dropdown, tilføj klik-for-at-redigere moms i tabellen, normalisér lagring |
