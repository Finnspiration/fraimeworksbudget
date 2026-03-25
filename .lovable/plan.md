

# Kontekstuelle kommentarer med chat-tråde

## Oversigt
Brugere kan oprette kommentarer direkte på felter/rækker i appen (f.eks. en konto-linje i resultatopgørelsen eller en udgift). Kommentaren starter en tråd i chat-systemet. Tråde kan lukkes når samtalen er færdig.

## Database-ændringer

### 1. Udvid `chat_channels` med tråd-metadata
```sql
ALTER TABLE chat_channels ADD COLUMN context_type text;      -- f.eks. 'resultat', 'future_expense', 'pipeline'
ALTER TABLE chat_channels ADD COLUMN context_ref text;        -- reference-id (konto-nr, expense-id, etc.)
ALTER TABLE chat_channels ADD COLUMN context_label text;      -- visningsnavn ("Konto 1010 – Salg", "Udgift: Husleje apr")
ALTER TABLE chat_channels ADD COLUMN is_thread boolean NOT NULL DEFAULT false;
ALTER TABLE chat_channels ADD COLUMN closed boolean NOT NULL DEFAULT false;
```

### 2. Realtime på chat_messages (allerede aktiveret? Tjekkes)

## Nye komponenter

### `src/components/CommentButton.tsx`
- En lille ikon-knap (💬) der kan placeres ved enhver celle/række
- Props: `contextType`, `contextRef`, `contextLabel`
- Ved klik: tjekker om der allerede findes en åben tråd for den kontekst → åbner den, ellers opretter ny kanal med `is_thread=true` og kontekst-metadata
- Tilføjer alle godkendte brugere som medlemmer (ligesom ved kanal-oprettelse)
- Viser et badge/indikator hvis der er en eksisterende aktiv tråd

### `src/components/ThreadPanel.tsx`
- Slide-over panel (Sheet) der viser trådens beskeder
- Genbruger besked-visning og input fra Chat.tsx (evt. udtrukket til fælles komponent)
- "Luk tråd"-knap der sætter `closed = true` på kanalen
- Lukket tråd kan stadig læses men ikke skrives til

## Integration i eksisterende tabs

### ResultatTab
- Tilføj `CommentButton` ved hver konto-række (contextType='resultat', contextRef=konto-nr)

### FutureExpensesTab
- Tilføj `CommentButton` ved hver udgifts-række (contextType='future_expense', contextRef=expense-id)

### PipelineTab
- Tilføj `CommentButton` ved hver pipeline-job (contextType='pipeline', contextRef=job-id)

## Chat-side opdatering
- Tråde vises i en separat sektion "Tråde" i sidebar
- Lukkede tråde vises nedtonet eller i en sammenklappet sektion
- Kontekst-label vises som overskrift i tråden

## RLS
- Genbruger eksisterende `is_channel_member` RLS — ingen nye policies nødvendige
- UPDATE policy på `chat_channels` tilføjes så medlemmer kan sætte `closed = true`

## Filer

| Fil | Ændring |
|---|---|
| Migration | Tilføj kolonner til `chat_channels` + UPDATE RLS policy |
| `src/components/CommentButton.tsx` | Ny — knap + opret/åbn tråd |
| `src/components/ThreadPanel.tsx` | Ny — besked-panel med luk-funktion |
| `src/components/budget/ResultatTab.tsx` | Tilføj CommentButton per konto-række |
| `src/components/budget/FutureExpensesTab.tsx` | Tilføj CommentButton per udgift |
| `src/components/budget/PipelineTab.tsx` | Tilføj CommentButton per job |
| `src/pages/Chat.tsx` | Vis tråde-sektion i sidebar, håndter lukkede tråde |

