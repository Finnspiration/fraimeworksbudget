

# Fix: Logo skal altid linke til overblik

## Problem
I `src/pages/Index.tsx` (linje 99) er logoet bare et `<img>` tag uden et `<Link>` wrapper — det er derfor ikke klikbart. `AppLayout.tsx` virker korrekt allerede.

## Ændring

### `src/pages/Index.tsx`
Wrap logoet i et `<Link to="/">` så det matcher AppLayout:

```tsx
// Linje 99: Fra
<img src={logo} alt="FraimeWorks" className="h-8" />

// Til
<Link to="/"><img src={logo} alt="FraimeWorks" className="h-8" /></Link>
```

`Link` er allerede importeret i filen (linje 16).

Én linje ændres i én fil.

