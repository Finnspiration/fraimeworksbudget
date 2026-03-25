

# Tilføj logo i AppLayout header

## Ændring

I `src/components/AppLayout.tsx` — tilføj logoet fra `src/assets/logo.png` i headeren, til venstre for navigationsknapperne, præcis som det allerede gøres i `Index.tsx`.

## Fil

| Fil | Ændring |
|---|---|
| `src/components/AppLayout.tsx` | Importér logo, tilføj `<img src={logo} alt="FraimeWorks" className="h-8" />` før nav-elementerne i headeren |

