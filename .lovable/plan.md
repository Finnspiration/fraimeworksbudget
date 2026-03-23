

# Kassekladde-import: Overskriv ændrede posteringer

## Problem

Nuværende duplikatlogik bruger nøglen `bilag_dato_konto_belob` til at finde dubletter. Hvis teksten er ændret i den nye fil (men bilag, dato, konto og beløb er ens), markeres rækken som dublet og springes over — den opdaterede tekst importeres aldrig.

## Løsning

### Fil: `src/components/budget/ImportTab.tsx`

1. **Udvid duplikat-kategorisering** (linje 121-126): Tilføj en tredje kategori `updatedRows` — rækker hvor nøglen matcher, men `tekst` er anderledes.

2. **Ændr `txnKey`** — behold som den er (bilag+dato+konto+belob). Tilføj en `txnFullKey` der inkluderer tekst til sammenligning.

3. **Ny logik i `useMemo`**:
   - Byg et map fra `txnKey` → eksisterende transaktion (med alle felter inkl. tekst)
   - For hver preview-række:
     - Hvis nøglen ikke findes: `newRow`
     - Hvis nøglen findes OG tekst er ens: `dupRow` (skip)
     - Hvis nøglen findes OG tekst er anderledes: `updatedRow` (overskriv)

4. **Opdatér `doImport`** (linje 128-144):
   - Indsæt nye rækker som nu
   - For `updatedRows`: find og erstat de eksisterende rækker i `txns` (match på `txnKey`, overskriv med nye værdier inkl. tekst, faktura, moms, modkonto)
   - Opdatér statusbesked: `"✓ Importerede X nye, opdaterede Y posteringer (Z uændrede sprunget over)"`

5. **Opdatér preview-visning** (linje 420-422):
   - Vis antal nye + opdaterede i knapteksten
   - Vis info om opdaterede rækker i preview-området

### Teknisk detalje

```typescript
const existingMap = useMemo(() => {
  const m = new Map<string, Transaction>();
  txns.forEach(t => m.set(txnKey(t), t));
  return m;
}, [txns]);

const { newRows, dupRows, updatedRows } = useMemo(() => {
  if (!preview) return { newRows: [], dupRows: [], updatedRows: [] };
  const n: Transaction[] = [], d: Transaction[] = [], u: Transaction[] = [];
  preview.forEach(t => {
    const key = txnKey(t);
    const existing = existingMap.get(key);
    if (!existing) n.push(t);
    else if (existing.tekst !== t.tekst || existing.faktura !== t.faktura 
             || existing.moms !== t.moms || existing.modkonto !== t.modkonto) 
      u.push(t);
    else d.push(t);
  });
  return { newRows: n, dupRows: d, updatedRows: u };
}, [preview, existingMap]);
```

I `doImport`: erstat matchende rækker og tilføj nye.

