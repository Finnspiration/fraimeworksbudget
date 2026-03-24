

# Persistente magic links med visning, kopiering og sletning

## Problem
Magic links genereres og vises i en dialog, men gemmes ikke. Når dialogen lukkes, er linket væk. Der er ingen indikation på brugerlisten om et link eksisterer.

## Løsning

### 1. Database: Tilføj `magic_link` kolonne på `profiles`
**Migration:** Tilføj `magic_link text` (nullable) på `profiles`-tabellen. Når et link genereres, gemmes det. Når det fjernes, sættes det til `NULL`.

### 2. Edge function: Gem linket i databasen
**Fil:** `supabase/functions/admin-generate-magic-link/index.ts`
- Efter generering, gem linket på `profiles.magic_link` via adminClient
- Returnér linket som nu

### 3. Admin UI: Vis, kopiér og fjern magic links
**Fil:** `src/pages/Admin.tsx`

- Udvid `UserRow` med `magic_link: string | null`
- Læs `magic_link` fra profiles i `load()`
- **På brugerlisten:** Vis en `Link2`-ikon/badge ved brugere der har et aktivt magic link
- **Generér-knap:** Når der klikkes, genereres link og gemmes — UI opdateres
- **Vis link:** Når bruger har et link, vis det i en sektion (readonly input + kopiér-knap)
- **Fjern link:** Knap til at slette magic_link fra profilen (`UPDATE profiles SET magic_link = NULL`)
- Kopiér-funktionen bruger den eksisterende fallback-metode

### Resultat
- Admin kan se hvem der har et magic link (badge/ikon på listen)
- Admin kan klikke for at se og kopiere linket
- Admin kan fjerne linket
- Linket persists mellem sideindlæsninger

| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Tilføj `magic_link text` på profiles |
| `supabase/functions/admin-generate-magic-link/index.ts` | Gem link i DB efter generering |
| `src/pages/Admin.tsx` | Vis/kopiér/fjern magic links, badge-indikator |

