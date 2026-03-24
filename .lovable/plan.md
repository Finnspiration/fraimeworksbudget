

# Login, chat, og Trello-todo board

## Overblik

Tilføj brugerauthentication med email/password, en fælles + privat chat, og et delt Trello-lignende todo-board. Admin kan godkende/afvise brugere.

## 1. Database-ændringer (migrationer)

### Tabeller

**profiles** — brugerprofiler
- `id uuid PK → auth.users(id) ON DELETE CASCADE`
- `name text NOT NULL`
- `approved boolean DEFAULT false`
- `created_at timestamptz DEFAULT now()`

**user_roles** — rollebaseret adgang
- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid → auth.users(id) ON DELETE CASCADE NOT NULL`
- `role app_role NOT NULL` (enum: `admin`, `user`)
- `UNIQUE(user_id, role)`

**chat_channels** — chatkanaler
- `id uuid PK`
- `name text` (NULL for private beskeder)
- `is_direct boolean DEFAULT false`
- `created_at timestamptz`

**chat_channel_members** — kanalmedlemmer
- `id uuid PK`
- `channel_id uuid → chat_channels`
- `user_id uuid → auth.users(id)`

**chat_messages** — beskeder
- `id uuid PK`
- `channel_id uuid → chat_channels`
- `user_id uuid → auth.users(id)`
- `content text NOT NULL`
- `created_at timestamptz`

**todo_columns** — Trello-kolonner
- `id uuid PK`
- `title text NOT NULL`
- `sort_order integer`
- `created_at timestamptz`

**todo_cards** — Trello-kort
- `id uuid PK`
- `column_id uuid → todo_columns`
- `title text NOT NULL`
- `description text`
- `assigned_to uuid → auth.users(id)` (nullable)
- `sort_order integer`
- `created_at timestamptz`

### Realtime
- Aktivér realtime for `chat_messages` og `todo_cards`

### RLS-politikker
- **profiles**: Alle authenticated kan læse godkendte profiler. Brugere kan opdatere egen profil. Admin kan opdatere alle.
- **user_roles**: Læs via `has_role()` security definer function
- **chat_messages**: Kun authenticated + approved brugere kan læse/skrive i kanaler de er medlem af
- **todo_columns/todo_cards**: Alle approved brugere kan CRUD

### Trigger
- Auto-opret profil ved signup (INSERT i profiles med `approved = false`)
- Første bruger der registrerer sig får automatisk `admin` rolle

### Security definer function
- `has_role(uuid, app_role)` til RLS

## 2. Auth-konfiguration
- Aktivér email/password signup
- Auto-confirm email (for nemheds skyld i dette setup)

## 3. Frontend-sider og komponenter

### Nye sider
- `/login` — Login + signup formular
- `/chat` — Chat-interface med kanalvælger (fælles + private)
- `/todo` — Trello-board med drag-and-drop kolonner
- `/admin` — Brugeradministration (godkend/afvis brugere, tildel roller)

### Auth-flow
- `AuthProvider` wrapper i App.tsx der tjekker session
- Redirect til `/login` hvis ikke logget ind
- Redirect til "afventer godkendelse"-side hvis `approved = false`
- Kun admin kan se `/admin`

### Navigation
- Tilføj navbar med links til: Budget, Chat, Todo, Admin (kun for admin)
- Vis brugerens navn + logout-knap

### Chat-komponenter
- `ChatSidebar` — liste over kanaler + direkte beskeder
- `ChatMessages` — beskedvisning med realtime subscription
- `ChatInput` — beskedinput
- `NewDirectMessage` — vælg bruger til privat besked

### Todo-komponenter
- `TodoBoard` — Trello-lignende board med kolonner
- `TodoColumn` — kolonne med kort og drag-and-drop
- `TodoCard` — kort med titel, beskrivelse, tildelt bruger
- `AddColumn` / `AddCard` — oprettelsesformularer
- Drag-and-drop via `@hello-pangea/dnd` (React-venligt DnD-bibliotek)

### Admin-komponenter
- Liste over brugere med godkendelsesstatus
- Knap til at godkende/afvise
- Knap til at tildele admin-rolle

## 4. Filer der oprettes/ændres

| Fil | Ændring |
|---|---|
| `supabase/migrations/...` | Alle nye tabeller, RLS, triggers, enum |
| `src/App.tsx` | AuthProvider, nye routes, navbar |
| `src/contexts/AuthContext.tsx` | Ny: auth state, session, profil, rolle |
| `src/pages/Login.tsx` | Ny: login/signup formular |
| `src/pages/Chat.tsx` | Ny: chat-interface |
| `src/pages/Todo.tsx` | Ny: Trello-board |
| `src/pages/Admin.tsx` | Ny: brugeradministration |
| `src/pages/AwaitingApproval.tsx` | Ny: ventebesked for ikke-godkendte |
| `src/components/chat/*` | Nye: ChatSidebar, ChatMessages, ChatInput |
| `src/components/todo/*` | Nye: TodoBoard, TodoColumn, TodoCard |
| `src/components/ProtectedRoute.tsx` | Ny: route guard for auth + approved |
| `src/hooks/use-chat.ts` | Ny: realtime chat hook |
| `src/hooks/use-todo.ts` | Ny: todo CRUD hook |
| `package.json` | Tilføj `@hello-pangea/dnd` |

## Implementeringsrækkefølge

1. Database-migrationer (tabeller, RLS, triggers, enum)
2. Auth-konfiguration
3. AuthContext + ProtectedRoute + Login-side
4. Admin-side (godkendelse af brugere)
5. Chat (kanaler + realtime beskeder)
6. Todo-board (kolonner + kort + drag-and-drop)
7. Navigation mellem alle sider

