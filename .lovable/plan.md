

# Fix: Bulk delete virker ikke — `confirm()` blokeres i sandboxed iframe

## Problem
`handleBulkDelete` bruger `confirm()` (browser-native dialog) til at bekræfte sletning. I sandboxed iframes (som Lovable preview) blokeres `confirm()` og returnerer altid `false`, så funktionen returnerer tidligt uden at slette noget.

## Løsning

### Fil: `src/components/budget/FutureExpensesTab.tsx`

Erstat `confirm()` med en `AlertDialog` fra shadcn/ui:

1. Tilføj state `showBulkDeleteConfirm` (boolean)
2. Knappen "Slet X valgte" sætter `showBulkDeleteConfirm = true` i stedet for at kalde `handleBulkDelete` direkte
3. Tilføj en `AlertDialog` komponent der viser "Er du sikker på at du vil slette X udgifter?" med Annuller/Slet-knapper
4. "Slet"-knappen kalder den faktiske slettelogik (uden `confirm()`)

```tsx
<AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Slet {selected.size} udgift{selected.size > 1 ? 'er' : ''}?</AlertDialogTitle>
      <AlertDialogDescription>Denne handling kan ikke fortrydes.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuller</AlertDialogCancel>
      <AlertDialogAction onClick={executeBulkDelete}>Slet</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

| Fil | Ændring |
|---|---|
| `src/components/budget/FutureExpensesTab.tsx` | Erstat `confirm()` med `AlertDialog` |

