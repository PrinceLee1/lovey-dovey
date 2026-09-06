# LoveyDovey — Frontend

React + TypeScript + Vite single-page app for **LoveyDovey**, a real-time game app for couples and friend groups: synced two-player games, AI-generated party games for group lobbies, XP/streaks/leaderboards, and an admin dashboard.

This is the frontend only. It talks to the [lovey-dovey-api](../lovey-dovey-api) Laravel backend over REST + Pusher-backed WebSockets.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- **React Router v7** (client-side routing, `BrowserRouter`)
- **Tailwind CSS v3** (`darkMode: 'class'`) + **Framer Motion** for animation
- **Axios** for REST calls, **Laravel Echo** + **Pusher JS** for real-time
- **lucide-react** for icons

No server-side rendering, no state management library beyond React context — auth and partner state live in small hand-rolled contexts/hooks (see below).

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev             # http://localhost:5173
```

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build locally
npm run lint        # eslint .
```

### Environment variables

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api` | Axios base URL — **includes** the `/api` prefix. Read in `src/libs/axios.ts`. |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Base URL **without** `/api` — used only to build the `/broadcasting/auth` URL in `src/libs/echo.ts`. |
| `VITE_PUSHER_APP_KEY` | `abc123` | Required. If empty, `new Pusher(...)` throws synchronously at import time and **the whole app fails to boot** — see Troubleshooting. |
| `VITE_PUSHER_APP_CLUSTER` | `mt1` | Pusher cluster. |
| `VITE_PUSHER_SCHEME` | `https` | Anything other than `http` forces TLS for the socket connection. |

There is no build-time distinction between environments beyond these variables — point them at whichever backend you're running (local `php artisan serve`, staging, production) and rebuild.

## Project structure

```
src/
  pages/            top-level routed screens (see Routes below)
  pages/admin/       admin dashboard screens, behind RequireAdmin
  games/             the actual game UIs — one file per game, plus two "runner"
                     wrappers that add real-time sync on top
  components/        shared UI (cards, modals, toasts, feedback widget, footer…)
  components/lobbies/  lobby-specific widgets (create-lobby modal, upcoming list)
  components/partners/ partner-linking UI
  context/           AuthContext (session/token), ToastContext (toast queue)
  hooks/             usePartner (active partner + pair status)
  libs/              axios client, Echo client, and thin per-domain API wrappers
                     (auth, partner, daily, leaderboard, notification, progress, streaks)
```

### Routes

| Path | Page | Notes |
|---|---|---|
| `/` | `Landing` | Marketing/landing page, public |
| `/onboarding` | `Onboarding` | Sign-up flow |
| `/signin` | `SignIn` | Login |
| `/forgot-password`, `/password-reset/:token` | `ForgotPassword`, `ResetPassword` | Password reset flow |
| `/games` | `GamesDashboard` | Main authenticated home — game catalog, quick actions, progress, leaderboard |
| `/settings` | `Settings` | Profile, notification prefs, dark mode toggle, sessions/devices, partner unpair |
| `/lobby/:code` | `LobbyRoom` | Group lobby: presence, chat, host-started games |
| `/session/:code` | `Session` | A live couple game session (see Real-time below) |
| `/admin/*` | `AdminLayout` + children | Admin dashboard, gated by `RequireAdmin` (checks `user.is_admin`) |

`vercel.json` adds a catch-all SPA rewrite (`/(.*)  → /index.html`) — **required** on Vercel (or any static host) so a hard refresh or a deep link (an emailed invite link, a bookmark) doesn't 404 before React Router even boots.

## Two real-time architectures

The app has **two distinct multiplayer models**, each with its own sync strategy — knowing which one a given game uses matters a lot when debugging or extending it.

### 1. Couple sessions — server-authoritative

Used by all "couple" games (Truth or Dare, Truth or Dare Plus/Erotic, Spice Dice, Emoji-Only Chat, Memory Match). Rendered by `src/pages/Session.tsx` at `/session/:code`.

- The **backend** owns the entire game state (`GameSession.state`, a JSON blob) and validates every move (whose turn it is, legal actions).
- The client just calls `POST /sessions/{code}/action` and re-renders whatever state comes back.
- Real-time sync is via a Pusher **presence channel** `couple-session.{code}`, receiving `.session.created` / `.session.updated` events — plus a 3-second polling fallback (`Session.tsx`) in case a broadcast is missed.
- A persistent side chat panel lives alongside the game (works on every kind, including Emoji Chat, which also has its own separate emoji-only messaging).
- Starting the same game kind twice with the same partner **resumes** the existing waiting/active session instead of creating a new one — this is what makes hitting the browser back button mid-game safe.

### 2. Lobby (group) games — host-authoritative, broadcast-relay

Used by Trivia, Charades (AI), Hot Seat, Would You Rather, and Spice Dice **in a group lobby** (a different code path from the couple version of Spice Dice). Rendered inside `src/pages/LobbyRoom.tsx` via `src/games/SyncedLobbyGameRunner.tsx`.

- The **host's browser** is the source of truth for game state. Non-host players' UI is a pure mirror of whatever the host last broadcast.
- Host → everyone: `broadcast(type, payload)` → `POST /lobbies/{code}/games/{id}/action` → relayed over Pusher channel `lobby-game.{id}` as `.LobbyGameUpdate`.
- Player → host: `sendAction(type, payload)` (e.g. a vote, a buzz) goes over the same channel; only the host's client applies it (`onHostReceive`) and re-broadcasts the resulting state.
- **This state is not persisted server-side beyond the final result** — a page reload mid-round currently re-initializes that client's local game state from scratch (the couple-session model above does not have this limitation).
- Every vote/action prop carries a monotonic `seq` so a client can dedupe an event it's already applied.
- Each player can only act for **themselves** — e.g. in Would You Rather, only your own row's A/B buttons are clickable, host included.

### Presence & auth for Echo

`src/libs/echo.ts` configures a `laravel-echo` client with a custom `authorizer` that POSTs the bearer token (from `localStorage.auth_token`) to `${VITE_API_URL}/broadcasting/auth`. Channel authorization rules live server-side in the backend's `routes/channels.php`.

## Games catalog

| Kind | Title | Category | Mode | Notes |
|---|---|---|---|---|
| `truth_dare` | Truth or Dare – Romantic | Romantic | Couple | Curated prompt bank (`TruthDarePrompts` on the backend), turn-based |
| `truth_dare_erotic` | Truth or Dare – Erotic | Erotic | Couple | Plus-only; same engine, spicier prompt pool |
| `spice_dice` | Spice Dice | Spicy | Couple *and* Lobby | Always draws a dare, never a truth |
| `emoji_chat` | Emoji-Only Chat | Playful | Couple | No turns, timed, emoji-only messages (server-validated) |
| `memory_match` | Memory Match – Couple Edition | Challenge | Couple | Server-dealt deck, match keeps your turn |
| `trivia` | Trivia Night: Duo vs Duo | Challenge | Lobby | AI-generated questions, cached & rotated (see backend README) |
| `charades_ai` | Charades with AI Prompts | Playful | Lobby | AI-generated prompt cards |
| `hot_seat`, `would_you_rather` | — | — | Lobby only | Not in the seeded catalog as standalone tiles; started from within a lobby |

"Plus" (Spicy/Erotic categories) requires `user.is_plus`, which the backend computes as **paid subscriber OR still inside their 14-day free trial** — the frontend never needs to know which; it just reads `user.is_plus`.

## Admin dashboard (`/admin`)

A separate, non-dark-mode-by-default (toggleable) shell (`AdminLayout`) gated by `RequireAdmin`. Responsive: sidebar collapses into a slide-in drawer below `md`.

| Page | Purpose |
|---|---|
| Overview | Platform stats (users, revenue, games played, signups) |
| Users | Search/filter, view profile, promote/demote admin, (de)activate, delete, bulk actions, last-login |
| Games | CRUD on the seeded game catalog; recent/all lobby sessions |
| Feedback | In-app user feedback inbox (bug/idea/praise/other), mark reviewed |
| Features & Tips | Compose an email announcement to every user who opted into "New features & tips"; history of past sends |
| Reports | Signups, games-by-kind, revenue, Plus conversions, top lobbies |
| Settings | Platform-wide toggles (maintenance mode, registration open, Plus pricing, announcement banner) |

The user-facing feedback widget (`src/components/FeedbackModal.tsx`) is available from the main dashboard's top bar for any signed-in user, not just admins.

## Progression system

- **XP**: awarded server-side. Standalone/local games and couple sessions post to `/history`; lobby games are credited when the host ends the session (every current lobby member gets the same XP, not just the host).
- **Streaks**: personal and couple streaks, bumped alongside XP (`StreakService` on the backend).
- **Daily Challenge**: one bonus-XP task per day (`DailyChallengeCard`).
- **Weekly summary**: an in-app card (`WeeklySummaryCard`) and an opt-in email digest, covering both couple games and lobby games.
- **Leaderboard**: couples ranked by XP, all-time/weekly/monthly.

## Notification preferences

Set in `/settings` (`email_news`, `email_reminders`, `weekly_summary`, `private_profile` on the user). `email_news` ("New features & tips") is the audience for the admin's Features & Tips announcements.

## Dark mode

Toggled via `localStorage.theme` (`'light' | 'dark'`) and a `dark` class on `<html>` (Tailwind's class strategy). Set from `Settings.tsx` for the main app and independently from the admin header (`AdminLayout.tsx`) — both read/write the same `localStorage` key so the preference is shared, but each surface applies the class itself on mount rather than relying on a single global bootstrap.

## Troubleshooting

- **Blank white page, console says "You must pass your app key when you instantiate Pusher"** — `VITE_PUSHER_APP_KEY` is empty. `echo.ts` constructs the Pusher client at module import time, so this crashes the entire app before React even renders, not just real-time features. Any non-empty placeholder value is enough to boot locally if you don't need working real-time (the socket just won't connect).
- **A route 404s on Vercel only after a refresh or when opened directly, but works fine when clicked from inside the app** — the SPA rewrite in `vercel.json` isn't deployed yet, or you're on a different static host without an equivalent catch-all rewrite configured.
- **`403` on `/broadcasting/auth`** — the bearer token isn't reaching the request; check `localStorage.auth_token` and that `VITE_API_URL` doesn't include a stray `/api` suffix (see the table above).
- **A game "restarts" after navigating away and back mid-session** — expected for **lobby** games (state isn't persisted beyond the final result, see above); for **couple** sessions this should not happen — if it does, check that the backend's session-resume logic (`CoupleSessionController::invite`) is up to date.

## Deployment

Static build, deployable anywhere that serves an SPA with a catch-all rewrite (Vercel config included). Set all `VITE_*` variables in the hosting provider's environment settings and rebuild — they're baked in at build time, not read at runtime.
