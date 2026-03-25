

# UI-forbedringer: Tråd-knapper og sideheaders

## Ændringer

### 1. ThreadPanel: Flyt "Luk tråd"-knap til venstre
I `src/components/ThreadPanel.tsx` — skab mere afstand mellem "Luk tråd"-knappen og Sheet's lukkekryds (X) ved at placere knappen til venstre i headeren (efter titlen) i stedet for helt til højre. Tilføj `mr-8` eller lignende margin for at undgå overlap med X-knappen.

### 2. Chat: Luk/genåbn tråd fra chat-visningen
I `src/pages/Chat.tsx` — når den aktive kanal er en tråd (`is_thread === true`), vis en "Luk tråd" / "Genåbn" knap i besked-headerområdet (linje 331-338). Tilføj state-tracking for `closed` status og en `toggleClosed`-funktion der updater `chat_channels.closed`. Når tråden er lukket, skjul input-feltet.

### 3. Tilføj header/titel på Chat, Opgaver og Admin sider
Disse sider mangler en sidetitel under navigationen. Tilføj en `<h1>` header-sektion i:
- `src/pages/Chat.tsx` — "Chat" (allerede har sidebar, så evt. i main content area)
- `src/pages/Todo.tsx` — "Opgaver" 
- `src/pages/Admin.tsx` — "Admin"

Da `AppLayout` allerede har en nav-header, tilføjes en page-titel-sektion under headeren i selve page-komponenterne, eller alternativt i `AppLayout` baseret på route.

## Filer

| Fil | Ændring |
|---|---|
| `src/components/ThreadPanel.tsx` | Flyt "Luk tråd"-knap til venstre med margin fra X |
| `src/pages/Chat.tsx` | Tilføj luk/genåbn tråd-knap i beskedheader + skjul input for lukkede tråde |
| `src/pages/Chat.tsx` | Tilføj sidetitel |
| `src/pages/Todo.tsx` | Tilføj sidetitel |
| `src/pages/Admin.tsx` | Tilføj sidetitel |

