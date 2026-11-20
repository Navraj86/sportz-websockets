<div align="center">

# ⚡ Sportz

**Real-time sports platform: publish a match event once, and every viewer sees it instantly.**

[![CI](https://github.com/Navraj86/sportz-websockets/actions/workflows/ci.yml/badge.svg)](https://github.com/Navraj86/sportz-websockets/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-20.9+-5FA04E?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-ws_8-0288D1)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

<img src=".github/assets/demo.gif" alt="Operator publishes a red card and a save in the console; both appear instantly in a separate viewer's match centre" width="100%">

<sub>Left: an operator publishes commentary. Right: a separate viewer receives it over WebSocket, live, without refreshing.</sub>

</div>

---

## What it is

Sportz is a full-stack, real-time match centre. Operators create fixtures and post play-by-play commentary; fans get live scoreboards, a match clock, a key-moment timeline and a commentary feed that updates the instant something happens.

| | |
|---|---|
| **Problem** | Live sports UIs are usually built on polling: slow, wasteful, and they scale badly as viewers grow. |
| **Approach** | One REST write path (validated, persisted in Postgres), then a push to only the sockets subscribed to that match. |
| **Result** | Events reach viewers as soon as they are saved, with no polling, and the server only does work for viewers who actually follow a match. |

## Screenshots

<table>
  <tr>
    <td width="33%"><a href=".github/assets/dashboard.png"><img src=".github/assets/dashboard.png" alt="Match centre dashboard"></a></td>
    <td width="33%"><a href=".github/assets/match-centre.png"><img src=".github/assets/match-centre.png" alt="Live match page"></a></td>
    <td width="33%"><a href=".github/assets/console.png"><img src=".github/assets/console.png" alt="Operator console"></a></td>
  </tr>
  <tr>
    <td align="center"><b>Match centre</b><br><sub>Live / upcoming / results, sport filter, search. New fixtures pop in live.</sub></td>
    <td align="center"><b>Live match</b><br><sub>Scoreboard, running clock, key-moment timeline, real-time feed.</sub></td>
    <td align="center"><b>Operator console</b><br><sub>Create fixtures and publish events with one-click presets.</sub></td>
  </tr>
</table>

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI["Next.js 16 app<br/>React 19 · Tailwind 4"]
    end

    subgraph Backend["Node.js process (one HTTP server)"]
        REST["Express 5 REST API<br/>Zod validation"]
        AJ["Arcjet<br/>shield · bot · rate limit"]
        HUB["WebSocket hub<br/>matchId → subscriber sockets"]
    end

    DB[("PostgreSQL<br/>Drizzle ORM")]

    UI -- "fetch /api/* (Next.js rewrite)" --> REST
    UI <-. "ws /ws (one shared socket)" .-> AJ
    AJ --> HUB
    REST --> DB
    REST -- "broadcast after commit" --> HUB
```

### Life of a live update

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operator
    participant API as Express API
    participant DB as PostgreSQL
    participant Hub as WS hub
    actor Fan as Viewer (match 7)

    Fan->>Hub: subscribe { matchId: 7 }
    Hub-->>Fan: subscribed
    Op->>API: POST /matches/7/commentary
    API->>API: Zod validate
    API->>DB: INSERT commentary
    API->>Hub: broadcastCommentary(7, row)
    Hub-->>Fan: { type: "commentary", data: row }
    API-->>Op: 201 Created
```

The database is the source of truth: events are persisted **before** they are broadcast, so a viewer who joins late (or reconnects) loads the same history over REST that live viewers saw over the socket. The client merges that history with anything that arrives on the socket mid-fetch, so no event is lost in between.

## Engineering highlights

| Decision | Why it matters |
|---|---|
| **Topic-based pub/sub** (`Map<matchId, Set<socket>>`) | A commentary broadcast touches only that match's subscribers, and the frame is serialised once, not per client. |
| **REST for writes, WebSocket for fan-out** | Writes get normal HTTP semantics (status codes, validation errors, retries); the socket stays a lightweight push channel. |
| **One shared client socket, ref-counted subscriptions** | Many components can follow the same match over a single connection. Subscriptions are restored automatically after a reconnect. |
| **Resilient reconnects** | Exponential backoff with jitter, plus instant reconnect when the tab becomes visible again or the network comes back. |
| **Server heartbeat and cleanup** | 30s ping/pong drops dead connections; closed sockets are removed from every match set, so memory does not leak. |
| **Abuse protection at the edge** | Arcjet checks every WebSocket upgrade (attack shield, bot detection, 5 upgrades / 2s) before the handshake completes. |
| **Validation everywhere** | Zod schemas for params, queries and bodies return field-level `400`s; incoming socket frames are capped at 1 MB. |
| **Same-origin frontend** | REST calls go through a Next.js `/api/*` rewrite, so there is no CORS surface to configure. |

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Node.js (ESM), Express 5, `ws` 8, Zod 4, Arcjet |
| Data | PostgreSQL (Neon in production), Drizzle ORM + Drizzle Kit migrations |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react, sonner |
| Quality | Vitest (23 tests, including real WebSocket integration tests), ESLint, `tsc`, GitHub Actions |
| Delivery | Dockerfile + Render Blueprint for the backend, Vercel for the frontend |

## Quick start

**Needs:** Node.js 20.9+, a PostgreSQL database, and a free [Arcjet](https://app.arcjet.com) key.

```bash
# 1. Backend  (http://localhost:8000, ws://localhost:8000/ws)
cd backend
cp .env.example .env          # set DATABASE_URL and ARCJET_KEY
npm install
npm run db:migrate
npm run dev

# 2. Frontend (http://localhost:3000), in a second terminal
cd frontend
npm install
npm run dev
```

Open **/console**, create a match, then open that match in another window and publish commentary to watch it arrive live.

> **No Postgres handy?** `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=sportz postgres:17-alpine`, then use `DATABASE_URL=postgresql://postgres:dev@localhost:5432/sportz`.

---

## Reference

<details>
<summary><b>REST API</b></summary>

<br>

Responses are wrapped in `{ "data": ... }`. Validation errors return `400` with `{ "error", "details": [zod issues] }`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/matches?limit=50` | Matches, newest first (max 100). |
| `POST` | `/matches` | Create a match. Status is derived from `startTime` / `endTime`. Broadcasts `match_created` to **all** clients. |
| `GET` | `/matches/:id/commentary?limit=10` | Commentary for a match, newest first (max 100). |
| `POST` | `/matches/:id/commentary` | Store an event. Broadcasts `commentary` to **that match's** subscribers. |

**Create a match** (`sport`, `homeTeam`, `awayTeam`, `startTime`, `endTime` required; scores default to 0):

```json
{
  "sport": "Football",
  "homeTeam": "Liverpool",
  "awayTeam": "Man City",
  "startTime": "2026-11-20T12:00:00.000Z",
  "endTime": "2026-11-20T13:52:00.000Z"
}
```

**Publish commentary** (`minute` and `message` required):

```json
{
  "minute": 71,
  "period": "2nd half",
  "eventType": "red_card",
  "actor": "Rúben Dias",
  "team": "Man City",
  "message": "Straight red! Dias hauls down Núñez as the last man.",
  "metadata": { "var": false },
  "tags": ["highlight"]
}
```

</details>

<details>
<summary><b>WebSocket protocol</b></summary>

<br>

Endpoint: `ws://<host>/ws`. On connect the server sends `{ "type": "welcome" }`.

| Direction | Message | Notes |
|---|---|---|
| Client → server | `{ "type": "subscribe", "matchId": 7 }` | Reply: `{ "type": "subscribed", "matchId": 7 }` |
| Client → server | `{ "type": "unsubscribe", "matchId": 7 }` | Reply: `{ "type": "unsubscribed", "matchId": 7 }` |
| Server → all clients | `{ "type": "match_created", "data": Match }` | After `POST /matches` |
| Server → subscribers | `{ "type": "commentary", "data": Commentary }` | After `POST /matches/:id/commentary` |
| Server → client | `{ "type": "error", "message": "Invalid JSON" }` | Malformed frame |

`data` is the full database row, the same shape the REST API returns.

</details>

<details>
<summary><b>Data model</b></summary>

<br>

```mermaid
erDiagram
    MATCHES ||--o{ COMMENTARY : has
    MATCHES {
        serial id PK
        text sport
        text home_team
        text away_team
        match_status status "scheduled | live | finished"
        timestamp start_time
        timestamp end_time
        int home_score
        int away_score
        timestamp created_at
    }
    COMMENTARY {
        serial id PK
        int match_id FK
        int minute
        int sequence
        text period
        text event_type
        text actor
        text team
        text message
        jsonb metadata
        text_array tags
        timestamp created_at
    }
```

</details>

<details>
<summary><b>Environment variables</b></summary>

<br>

**`backend/.env`**

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | | PostgreSQL connection string |
| `ARCJET_KEY` | Yes | | Server refuses to start without it |
| `ARCJET_MODE` | No | `LIVE` | `DRY_RUN` logs decisions instead of blocking (use for scripted/headless clients) |
| `ARCJET_ENV` | No | | `development` lets Arcjet accept localhost; remove in production |
| `PORT` / `HOST` | No | `8000` / `0.0.0.0` | Leave `PORT` unset on hosts that inject it |

**`frontend/.env.local`** (optional for local dev)

| Variable | Default |
|---|---|
| `BACKEND_URL` | `http://localhost:8000` (server-side proxy target) |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws` |

</details>

<details>
<summary><b>Project structure</b></summary>

<br>

```text
backend/
  src/
    index.js            HTTP server: Express routers + WebSocket hub on one port
    arcjet.js           Arcjet rules for WS upgrades (active) and HTTP (opt-in)
    ws/server.js        Pub/sub, heartbeat, upgrade protection
    routes/             /matches, /matches/:id/commentary
    validation/         Zod schemas
    db/                 Drizzle schema + pg pool
  drizzle/              SQL migrations
  tests/                Vitest: WS integration, status logic, validation
frontend/
  src/app/              Routes: /, /matches/[id], /console
  src/components/       Dashboard, match centre, operator console, realtime provider
  src/hooks/            useMatches, useCommentary, useNow
  src/lib/              API client, types, event styles, match helpers
render.yaml             Render Blueprint for the backend
.github/workflows/      CI: tests, lint + type check, Docker build
```

</details>

<details>
<summary><b>Testing and CI</b></summary>

<br>

```bash
cd backend && npm test
```

- **`ws-server.test.js`** starts a real HTTP + WebSocket server and connects real clients: per-match isolation (match 1 subscribers never see match 2), unsubscribe, broadcast-to-all, malformed frames, cleanup on disconnect, and rejected upgrades on other paths.
- **`match-status.test.js`** covers status derivation, including missing or invalid dates.
- **`validation.test.js`** covers the Zod schemas.

GitHub Actions runs on every push and PR: backend tests, frontend lint + type check, and a Docker image build.

</details>

<details>
<summary><b>Deployment</b></summary>

<br>

The backend holds WebSocket connections and broadcasts from memory, so it must run as a **long-lived process** (not serverless).

- **Backend:** Render → *New → Blueprint* → this repo (uses [`render.yaml`](render.yaml)), then set `DATABASE_URL` and `ARCJET_KEY`. Any container host works via [`backend/Dockerfile`](backend/Dockerfile).
- **Frontend:** Vercel, with `BACKEND_URL=https://<backend>` and `NEXT_PUBLIC_WS_URL=wss://<backend>/ws`.

</details>

---

## Current limits and roadmap

Honest about where this stands today:

- **Single instance.** Subscriptions live in process memory. Next step: Redis pub/sub so several backend instances can share match channels.
- **Scores are set at creation.** A score-update endpoint with a live score broadcast is next (the validation schema already exists).
- **Stored status is not re-synced.** The client derives status from start/end times; a periodic server-side sync would keep the DB in step.
- **REST rate limiting is built but off.** `securityMiddleware()` is ready in [`arcjet.js`](backend/src/arcjet.js) and needs enabling in `index.js`.
- **Not load tested yet.** The fan-out design is O(subscribers per match), but there are no benchmark numbers.

## License

ISC, as declared in [`backend/package.json`](backend/package.json).
