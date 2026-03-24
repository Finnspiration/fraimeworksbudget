

# Fix: Edge function bruger forkert env-variabel

## Problem
Edge function `admin-create-user` refererer til `Deno.env.get("SUPABASE_PUBLISHABLE_KEY")` på linje 19, men den korrekte hemmelighed i edge function-miljøet hedder `SUPABASE_ANON_KEY`.

## Løsning

### Fil: `supabase/functions/admin-create-user/index.ts`
Ændr linje 19 fra:
```typescript
const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
```
til:
```typescript
const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
```

Ingen andre ændringer nødvendige.

| Fil | Ændring |
|---|---|
| `supabase/functions/admin-create-user/index.ts` | Ret env-variabelnavn fra `SUPABASE_PUBLISHABLE_KEY` → `SUPABASE_ANON_KEY` |

