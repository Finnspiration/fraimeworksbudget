

# Permanente magic links (udløber aldrig)

## Problem
Supabase's built-in magic link tokens udløber efter kort tid (typisk 1 time). Det kan ikke ændres. Derfor skal vi bygge vores eget permanente token-system.

## Løsning

Erstat Supabase's `generateLink` med et custom token-system:

### 1. Database: Tilføj `magic_token` på `profiles`
**Migration:**
- Tilføj `magic_token uuid DEFAULT NULL` kolonne på `profiles`
- Brug dette token som den permanente identifikator i linket

### 2. Edge function: `admin-generate-magic-link` → generér permanent token
**Fil:** `supabase/functions/admin-generate-magic-link/index.ts`

- I stedet for `admin.generateLink()`, generér et tilfældigt UUID token
- Gem token i `profiles.magic_token`
- Returnér et link i formatet: `https://fraimeworksbudget.lovable.app/auth/magic?token=<uuid>`
- Gem dette link i `profiles.magic_link` som før

### 3. Ny edge function: `verify-magic-token`
**Fil:** `supabase/functions/verify-magic-token/index.ts`

- Modtag `token` fra request
- Slå op i `profiles` hvor `magic_token = token`
- Hvis fundet: brug `adminClient.auth.admin.generateLink({ type: 'magiclink', email })` til at lave et **kortvarigt** Supabase-link og redirect browseren dertil (med `/auth/callback` som redirect)
- Hvis ikke fundet: returnér fejl

Flowet bliver:
```text
Permanent link → verify-magic-token → generér frisk Supabase-link → redirect → /auth/callback → logget ind
```

### 4. Ny route: `/auth/magic`
**Fil:** `src/pages/AuthCallback.tsx` (udvid) eller ny `src/pages/MagicRedirect.tsx`

- Læs `token` fra URL query parameter
- Kald `verify-magic-token` edge function
- Vis spinner mens token verificeres
- Redirect til det returnerede Supabase-link (som håndterer selve login)

### 5. Opdatér routing
**Fil:** `src/App.tsx`
- Tilføj `/auth/magic` route

### 6. Admin UI: Ingen ændringer nødvendige
`magic_link` i `profiles` vil nu indeholde det permanente link. Kopiér/fjern fungerer som før.

## Resultat
- Magic links udløber aldrig — tokenet i databasen er permanent
- Hver gang linket bruges, genereres et friskt Supabase-login on-the-fly
- Linket kan genbruges ubegrænset
- Admin kan stadig se, kopiere og fjerne links

| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Tilføj `magic_token uuid` på profiles |
| `supabase/functions/admin-generate-magic-link/index.ts` | Generér permanent token i stedet for Supabase magic link |
| `supabase/functions/verify-magic-token/index.ts` | Ny: verificér token og generér frisk login-link |
| `src/pages/MagicRedirect.tsx` | Ny: håndtér permanent magic link token |
| `src/App.tsx` | Tilføj `/auth/magic` route |

