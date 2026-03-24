

# Fix: Kanaloprettelse fejler pga. SELECT-policy timing

## Problem
`createChannel` og `createDm` i `Chat.tsx` bruger `.insert(...).select().single()`. Supabase kører SELECT-policyen som del af RETURNING, men SELECT-policyen kræver `is_channel_member(id, auth.uid())` — og membership-rækken er endnu ikke oprettet.

FraimeWorks_Project undgår dette fordi deres SELECT-policy er scopet til projekt-adgang, ikke til thread-deltagelse.

## Løsning

### Fil: `src/pages/Chat.tsx`

**`createChannel` (ca. linje 106-127):**
- Generér `channelId` med `crypto.randomUUID()` før insert
- Insert kanal med eksplicit id **uden** `.select().single()`
- Tjek for fejl, vis toast ved fejl
- Insert skaberens membership med det kendte id
- Insert øvrige godkendte brugere
- Reload kanaler, sæt aktiv kanal

**`createDm` (ca. linje 150-168):**
- Samme mønster: generér id, insert uden `.select()`, insert begge memberships, reload

```text
Før:  insert → .select().single() → RLS kræver membership → fejl
Efter: insert (uden select) → insert membership → reload → OK
```

### Ingen databaseændringer
RLS-policies er korrekte. Fejlen er i klient-koden.

| Fil | Ændring |
|---|---|
| `src/pages/Chat.tsx` | Fjern `.select().single()`, brug client-side UUID |

