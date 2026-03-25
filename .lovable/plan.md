

# Notifikationstællere i navigationen

## Oversigt
Tilføj badge-tællere på "Chat" og "Opgaver" knapperne i header-navigationen, der viser antal ulæste chat-beskeder og nye/utildelte opgaver.

## Tilgang

### Database: Ny tabel `chat_last_read`
Tracker hvornår hver bruger sidst læste hver kanal:

```sql
CREATE TABLE public.chat_last_read (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);
ALTER TABLE public.chat_last_read ENABLE ROW LEVEL SECURITY;
-- Brugere kan læse/skrive egne rækker
CREATE POLICY "Users manage own read status" ON public.chat_last_read
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Ny hook: `src/hooks/use-unread-counts.ts`
- Henter alle brugerens kanaler via `chat_channel_members`
- Henter `chat_last_read` for brugeren
- Tæller beskeder i hver kanal der er nyere end `last_read_at` (eller alle hvis ingen read-entry)
- Lytter på realtime `INSERT` på `chat_messages` for at opdatere tælleren live
- Returnerer `{ unreadChat: number, unreadTasks: number }`

For opgaver: tæller `todo_cards` der ikke er tildelt nogen (`assigned_to IS NULL`) eller er nyere end en bestemt dato — eller simpelthen antal kort i første kolonne (backlog). Alternativt: tæller kort tildelt til brugeren.

### Opdater last_read
I `Chat.tsx`: Når brugeren åbner/ser en kanal, upsert `chat_last_read` med `now()`.

### UI-ændringer

**`src/components/AppLayout.tsx`** og **`src/pages/Index.tsx`** (begge har navigation):
- Importer hooket og Badge-komponenten
- Vis en rød badge med tallet ved siden af "Chat" og "Opgaver" når count > 0

## Filer

| Fil | Ændring |
|---|---|
| Migration | Opret `chat_last_read` tabel + RLS |
| `src/hooks/use-unread-counts.ts` | Ny — hook der returnerer ulæste tællere |
| `src/components/AppLayout.tsx` | Tilføj badge på Chat og Opgaver knapper |
| `src/pages/Index.tsx` | Tilføj badge på Chat og Opgaver knapper i Index-headeren |
| `src/pages/Chat.tsx` | Upsert `chat_last_read` ved kanalskift |

