

# Fix: Logo-klik skal altid føre til Overblik-tab

## Problem
Logoet linker til `/`, men da man allerede er på `/`, sker der ingenting — man forbliver på den aktive tab (fx "Fremtidige udgifter").

## Løsning

### `src/pages/Index.tsx`
Erstat `<Link to="/">` omkring logoet med en `<a>` eller `onClick`-handler der sætter tab til `'overblik'`:

```tsx
// Fra:
<Link to="/"><img src={logo} alt="FraimeWorks" className="h-8" /></Link>

// Til:
<a href="#" onClick={(e) => { e.preventDefault(); setTab('overblik'); }} className="cursor-pointer">
  <img src={logo} alt="FraimeWorks" className="h-8" />
</a>
```

Én linje ændres i én fil. Logoet nulstiller nu altid til Overblik-tabben.

