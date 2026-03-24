

# Adoptér FraimeWorks_Project magic link-løsning

## Problem
Den nuværende løsning bruger en redirect-kæde (`window.location.href` → Supabase auth URL → `/auth/callback`) som fejler i Safari og på mobil. FraimeWorks_Project har en bedre løsning der bruger `verifyOtp()` direkte på klienten.

## Ændringer

### 1. Opdatér `verify-magic-token` edge function
**Fil:** `supabase/functions/verify-magic-token/index.ts`

I stedet for at returnere `authLink` (som browseren redirectes til), returnér `token_hash` og `type` fra det genererede link — præcis som FraimeWorks_Project gør:

```typescript
const generatedUrl = new URL(data.properties.action_link);
const hashedToken = generatedUrl.searchParams.get("token");
const type = generatedUrl.searchParams.get("type");

return { token_hash: hashedToken, type };
```

### 2. Opdatér `MagicRedirect.tsx`
**Fil:** `src/pages/MagicRedirect.tsx`

I stedet for `window.location.href = result.authLink`, brug `supabase.auth.verifyOtp()`:

```typescript
const { error } = await supabase.auth.verifyOtp({
  token_hash: result.token_hash,
  type: result.type || "magiclink",
});
if (error) throw error;
navigate("/", { replace: true });
```

Ingen browser-redirect. Sessionen etableres direkte i klienten, og brugeren navigeres internt i appen.

### 3. Ingen databaseændringer nødvendige
Den eksisterende `magic_token`-kolonne på `profiles` fungerer fint. FraimeWorks_Project bruger en separat tabel, men det er ikke strengt nødvendigt for dette projekts behov.

## Resultat
- Ingen redirect-kæde → virker i Safari og på mobil
- Session etableres direkte via `verifyOtp()` i klienten
- Permanent token-system bevares (genbrugeligt, udløber aldrig)
- Simplere og mere robust flow

| Fil | Ændring |
|---|---|
| `supabase/functions/verify-magic-token/index.ts` | Returnér `token_hash` + `type` i stedet for `authLink` |
| `src/pages/MagicRedirect.tsx` | Brug `verifyOtp()` i stedet for `window.location.href` redirect |

