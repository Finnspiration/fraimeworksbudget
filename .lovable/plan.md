

# Fix: Infinite recursion i chat_channel_members RLS

## Problem
RLS SELECT-politikken på `chat_channel_members` refererer til sig selv — den tjekker om brugeren er medlem ved at query `chat_channel_members`, hvilket skaber uendelig rekursion.

Når en kanal oprettes og medlemmer indsættes, trigges SELECT-politikken som en del af INSERT-flowet, og det fejler.

## Løsning

### 1. Database-migration

1. Opret en `SECURITY DEFINER` funktion `is_channel_member(channel_id uuid, user_id uuid)` der tjekker membership uden at gå igennem RLS
2. Drop den eksisterende rekursive SELECT-policy på `chat_channel_members`
3. Opret ny SELECT-policy der bruger `is_channel_member()` funktionen

```sql
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;
```

Ny policy:
```sql
CREATE POLICY "Members can read channel members"
ON public.chat_channel_members FOR SELECT
TO authenticated
USING (is_channel_member(channel_id, auth.uid()));
```

### Filer

| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Ny funktion + erstat rekursiv RLS-policy |

