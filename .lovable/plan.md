

# Fix: Fremtidige udgifter — layout og funktionalitetsforbedringer

## Problemer

1. **Momskode mangler** i tabellen (vises, men gemmes/vises ikke konsistent)
2. **Datoformat** bruger `dd/MM/yyyy` men kassekladden viser råformat (`yyyy-MM-dd`) — skal matche kassekladdens format
3. **Redigering** virker kun via double-click — ikke tydeligt nok
4. **Tekst-kolonnen** er for smal, dato-kolonnen for bred
5. **Konto** viser kun nummer — skal også vise kontonavn som i kassekladden

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

**1. Datoformat:** Kassekladden viser dato som `yyyy-MM-dd` (rå ISO-format fra `t.dato`). Ændr FutureExpensesTab til samme format — vis `exp.dato` direkte i stedet for at reformatere til `dd/MM/yyyy`.

**2. Konto med navn:** I tabelvisningen, vis konto som `{exp.konto} {acctMap.get(exp.konto)}` — ligesom kassekladden gør det (linje 639-642 i ImportTab).

**3. Tekst-kolonne bredere, dato smallere:** Ændr grid-layout:
- Add-formularen: `grid-cols-[90px_1fr_90px_180px_60px_40px]` (dato smallere, tekst 1fr)
- Tabel: dato-kolonne `w-24`, tekst uden max-width begrænsning

**4. Moms synlig:** Momskoden vises allerede i tabellen, men sørg for den også gemmes og vises korrekt (den er der allerede — verificeret i koden).

**5. Redigering mere tilgængelig:** Tilføj en edit-knap (blyant-ikon) i actions-kolonnen for aktive rækker, i stedet for kun double-click.

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Datoformat, konto med navn, layout-justeringer, edit-knap |

