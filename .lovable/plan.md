

# Fix: Magic links logger forkert bruger ind + virker ikke i Safari

## Problemer

### Problem 1: Charlotte's magic link logger Finn ind
Når admin (Finn) åbner Charlotte's magic link i **samme browser**, sker der et session-skift. Men appen håndterer ikke dette korrekt — `onAuthStateChange` modtager `SIGNED_IN`-eventet for Charlotte, men den eksisterende Finn-session i localStorage kan forstyrre. Derudover: hvis admin tester linket i sin egen browser, er Finn allerede logget ind.

**Årsag**: Magic links virker faktisk korrekt — de skifter session. Men appen genindlæser ikke profil-data korrekt ved session-skift, og admin tester sandsynligvis i samme browser.

### Problem 2: Safari sender til login-siden
Magic link redirecter til `https://fraimeworksbudget.lovable.app/` → `ProtectedRoute` tjekker `session` → session er endnu ikke etableret (race condition) → redirect til `/login`. Safari er ekstra sårbar fordi ITP (Intelligent Tracking Prevention) kan forsinke token-exchange fra URL-hash.

**Årsag**: `redirect_to` peger på `/` som er beskyttet af `ProtectedRoute`. Når brugeren lander der, har Supabase-klienten endnu ikke nået at parse URL-hash tokens og etablere sessionen. Så `loading` er `false` men `session` er `null` → redirect til `/login`.

## Løsning

### 1. Tilføj en `/auth/callback` route der håndterer token-exchange
**Fil:** `src/pages/AuthCallback.tsx` (ny)

- Ny side der vises ved `/auth/callback`
- Viser en loading-spinner
- Lader Supabase-klienten parse URL-hash tokens og etablere session
- Venter på `onAuthStateChange` med `SIGNED_IN` event
- Redirecter derefter til `/` (eller `/awaiting-approval` hvis ikke godkendt)

### 2. Opdatér redirect_to i magic link generering
**Fil:** `supabase/functions/admin-generate-magic-link/index.ts`

- Ændr `generateLink` til at inkludere `options.redirectTo` der peger på `https://fraimeworksbudget.lovable.app/auth/callback`
- Dette sikrer at magic links lander på en ubeskyttet side der kan håndtere token-exchange

### 3. Registrér den nye route
**Fil:** `src/App.tsx`

- Tilføj `/auth/callback` route med `<AuthCallback />` (ubeskyttet, ingen `ProtectedRoute`)

### 4. Håndtér session-skift korrekt i AuthContext
**Fil:** `src/contexts/AuthContext.tsx`

- Sørg for at `onAuthStateChange` ved `SIGNED_IN` event altid genindlæser profil for den nye bruger (også ved skift fra Finn → Charlotte)
- Reset `profile` og `isAdmin` inden ny profil hentes, så der ikke vises stale data

## Resultat
- Magic links åbner på en ubeskyttet callback-side → ingen race condition
- Token-exchange sker før ProtectedRoute tjekker session
- Safari får tid til at parse URL-hash og etablere session
- Session-skift viser korrekt bruger (ikke den forrige)

| Fil | Ændring |
|---|---|
| `src/pages/AuthCallback.tsx` | Ny: håndterer magic link token-exchange |
| `src/App.tsx` | Tilføj `/auth/callback` route |
| `supabase/functions/admin-generate-magic-link/index.ts` | Sæt `redirectTo` til `/auth/callback` |
| `src/contexts/AuthContext.tsx` | Reset stale data ved session-skift |

