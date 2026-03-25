

# Fjern Budget-knap fra navigation, logo linker til overblik

## Ændringer

### `src/components/AppLayout.tsx`
- Fjern Budget-posten (`{ to: '/', label: 'Budget', icon: BarChart3 }`) fra `navItems` arrayet
- Logoet linker allerede til `/` — ingen ændring nødvendig der
- Fjern `BarChart3` fra imports

### `src/pages/Index.tsx`
- Logoet er allerede vist i Index-headeren — sikr det linker til `/` (det er allerede på Index, så det er fine som det er)
- Ingen ændring nødvendig — logoet er allerede på plads

## Omfang
Kun én fil ændres: `src/components/AppLayout.tsx` — fjern Budget fra nav-listen.

