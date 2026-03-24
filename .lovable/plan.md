

# Fix: Magic link kopi + chat-kanaloprettelse

## Problem 1: Kopier magic link fungerer ikke

`navigator.clipboard.writeText()` kræver en sikker kontekst (HTTPS) og brugerens tilladelse. I preview-miljøet eller iframes kan dette fejle stille. Løsningen er at bruge en fallback-metode.

### Fil: `src/pages/Admin.tsx`

Erstat `copyLink`-funktionen med en robust kopi-metode der bruger `navigator.clipboard.writeText()` med fallback til den ældre `document.execCommand('copy')` teknik (opret et midlertidigt textarea-element). Wrap i try/catch så fejl fanges og vises som toast.

## Problem 2: Kan ikke oprette tråd/kanal i chat

`createChannel` inserter i `chat_channels`, men RLS-politikken for INSERT kræver `is_approved(auth.uid())`. Hvis det fejler stille (ingen error-handling), ser det ud som om intet sker.

### Fil: `src/pages/Chat.tsx`

- Tilføj error-handling på `createChannel`: tjek `error` fra insert-kaldet og vis toast ved fejl
- Tilføj error-handling på `createDm`: samme
- Tilføj error-handling på `sendMessage`: samme
- Log fejl så vi kan se hvad der sker

Derudover: `createChannel` inserter uden `is_direct: false` eksplicit — det er OK (default er false), men der mangler fejlhåndtering der kan afsløre RLS-problemer.

## Filer

| Fil | Ændring |
|---|---|
| `src/pages/Admin.tsx` | Robust clipboard-kopi med fallback |
| `src/pages/Chat.tsx` | Tilføj error-handling + toast på alle mutationer |

