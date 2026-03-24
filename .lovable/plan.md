

# Generér magic links til brugere fra admin-panelet

## Overblik

Tilføj en "Magic link"-knap på hver bruger i admin-panelet. Når admin klikker, genereres et magic link via en ny edge function (som bruger `admin.generateLink`), og linket vises i en dialog så admin kan kopiere det og sende det til brugeren.

## Ændringer

### 1. Ny edge function: `admin-generate-magic-link`
**Fil:** `supabase/functions/admin-generate-magic-link/index.ts`

- Verificér at kalderen er admin (samme mønster som `admin-create-user`)
- Modtag `email` i request body
- Kald `adminClient.auth.admin.generateLink({ type: 'magiclink', email })` 
- Returnér det genererede link (`properties.action_link`)

### 2. Magic link-knap + kopiér-dialog i admin-panelet
**Fil:** `src/pages/Admin.tsx`

- Tilføj `Link`-ikon-knap på hver brugerræk
- Ved klik: kald edge function med brugerens email (hentes via et lookup eller gemmes i UserRow)
- Vis resultatet i en dialog med linket + "Kopiér"-knap
- Toast ved succesfuld kopiering

### 3. Gem email på UserRow
**Fil:** `src/pages/Admin.tsx`

- Udvid `load()` til også at hente brugerens email. Da email ikke er på `profiles`, hentes den via edge function eller tilføjes som kolonne.
- Simplere løsning: Tilføj `email` kolonne på `profiles`-tabellen og populér den i `handle_new_user`-triggeren.

### 4. Database-migration
- Tilføj `email text` kolonne på `profiles`
- Opdatér `handle_new_user` triggeren til også at gemme `NEW.email`

## Filer

| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Tilføj `email` på profiles, opdatér trigger |
| `supabase/functions/admin-generate-magic-link/index.ts` | Ny: generér magic link via admin API |
| `src/pages/Admin.tsx` | Magic link-knap, kopiér-dialog, vis email |

