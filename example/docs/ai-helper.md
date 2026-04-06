# AI Helper — meteor-stale-session

> This file is intended for LLM coding assistants (Copilot, Cursor, Antigravity, etc.).
> It describes the package's purpose, architecture, data flow, configuration, and known gotchas
> so the assistant can reason correctly about this codebase without exploratory searches.

---

## What This Package Does

`bboyredstar:stale-session` is a Meteor package that **automatically logs out users who have
been inactive for too long**. "Inactive" means no mouse/keyboard events were detected on the
client within a configurable window.

It works by having the client send periodic **heartbeat** signals to the server while the user
is active. The server stores each heartbeat in a MongoDB collection. A background job on the
server periodically scans for heartbeat documents that are older than the inactivity threshold
and force-logs out those users by wiping their DDP login tokens.

---

## Package Location

```
example/packages/stale-session/          ← local Meteor package (bboyredstar:stale-session)
  index.ts                               ← public exports
  package.js                            ← Meteor package descriptor
  imports/lib/
    stale-session.ts                    ← unified StaleSession class (client + server)
    types.d.ts                          ← TypeScript interfaces
    utils/
      constants.ts                      ← default values, valid event list, method name
      schemas.ts                        ← simpl-schema validation for config
      settings.ts                       ← reads Meteor.settings at module load time
```

---

## Key Entrypoints

| File | Purpose |
|------|---------|
| `example/server/main.js` | Creates `StaleSession`, calls `run()`, publishes heartbeats |
| `example/client/main.jsx` | Creates `StaleSession`, calls `run()`, mounts React app |
| `example/imports/ui/Home.jsx` | Dashboard UI — renders timer, heartbeat count, debug panel |
| `example/settings.json` | Runtime config loaded via `--settings settings.json` |

---

## Architecture — Unified Class

`StaleSession` is a **single class** that detects its environment at runtime via
`Meteor.isClient` / `Meteor.isServer` and switches behaviour:

```
new StaleSession(config?, logger?)
        │
        ├─ constructor: reads Meteor.settings fallback → validates config
        │
        └─ .run()
              ├─ Meteor.isClient → runClient()
              │     • waits for jQuery + lodash.throttle dynamic imports
              │     • setInterval every heartbeatIntervalMs:
              │         if (user logged in AND activityDetected) → callAsync('heartbeat')
              │     • $(document).on(activityEvents) → throttled → sets activityDetected=true
              │
              └─ Meteor.isServer → runServer()
                    • registers 'heartbeat' DDP method
                    • registers Accounts.onLogin cleanup hook
                    • starts runStaleSession() interval
```

---

## Heartbeat Flow (step by step)

```
CLIENT                                          SERVER
──────                                          ──────
User moves mouse / clicks / presses key
  → jQuery event fires
  → throttled handler (5 s debounce)
  → activityDetected = true

Every heartbeatIntervalMs (default 30 s):
  if (user logged in && activityDetected)
    → Meteor.callAsync('heartbeat', {})  ──────▶  'heartbeat' DDP method:
                                                    1. removeAsync({ userId })   ← clean old docs
                                                    2. insertAsync({ userId, createdAt: new Date() })
                                                    3. returns { _id, createdAt }
    activityDetected = false

                                          Every heartbeatIntervalMs (server setInterval):
                                            query: { createdAt: { $lte: now - inactiveTimeoutMs } }
                                            for each stale heartbeat:
                                              load user's loginTokens
                                              if any token.when > heartbeat.createdAt
                                                → user re-authed on another device → SKIP logout
                                                → just remove stale heartbeat doc
                                              else
                                                → add userId to logout list
                                            updateAsync: { $set: { loginTokens: [] } }  ← force logout
                                            removeAsync: stale heartbeat docs
```

---

## Configuration

Configuration is read from **`Meteor.settings.public.packages['stale-session']`** at module
load time (`settings.ts`). All fields have defaults and can be overridden by passing a
`config` object to the constructor.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inactiveTimeoutMs` | `number` | `1 800 000` (30 min) | Time after last heartbeat before a session is considered stale |
| `heartbeatIntervalMs` | `number` | `180 000` (3 min) | How often the client sends heartbeats AND how often the server scans |
| `forceLogout` | `boolean` | `false` | If false, stale sessions are detected but NOT logged out |
| `heartbeatCollectionName` | `string` | `"heartbeat"` | MongoDB collection name for heartbeat documents |
| `activityEvents` | `string` | `"mousemove click keydown"` | Space-separated jQuery events treated as user activity |

**Current `settings.json` values (example app):**
```json
{
  "inactiveTimeoutMs": 300000,
  "heartbeatIntervalMs": 30000,
  "forceLogout": true,
  "heartbeatCollectionName": "user_sessions",
  "activityEvents": "click keydown"
}
```

> ⚠️ `inactiveTimeoutMs` must be meaningfully larger than `heartbeatIntervalMs`.
> Setting them equal gives the user zero grace period — the stale check fires the
> same tick the heartbeat expires.

---

## MongoDB Collection Schema

Collection name: configured by `heartbeatCollectionName` (default `"heartbeat"`).

```typescript
interface HeartbeatDocument {
  _id: string;
  userId: string;       // Meteor.userId() of the active user
  createdAt: Date;      // server timestamp of the last heartbeat
}
```

One document per user at most — the `'heartbeat'` method always removes the old doc before
inserting a fresh one.

---

## DDP Method

**Name:** `"heartbeat"` (exported as `HEARTBEAT_METHOD_NAME` from `utils/constants.ts`)

**Called by:** client, inside the heartbeat interval, only when `activityDetected === true`

**Returns:** `{ _id: string, createdAt: Date }` or `undefined` if user is not logged in

**Side effects:**
1. Removes all existing heartbeat docs for `userId`
2. Inserts a new heartbeat doc with `createdAt = new Date()`

---

## Meteor Publications

`'staleSessionHeartbeats'` — published in `server/main.js`. Returns heartbeat docs for the
currently logged-in user only. Unauthenticated subscribers receive `this.ready()` and no data.

`'user'` — publishes the current user document (used by `App.jsx` for auth routing).

---

## Multi-Device Safety

The stale session check guards against logging out users who have re-authenticated on a
different device after an existing session went stale:

1. Before wiping tokens for a stale user, the server loads their current `loginTokens`
2. If any token has `when > heartbeat.createdAt`, the user logged in after that heartbeat
   was recorded — they have an active session and **must not be logged out**
3. Only the stale heartbeat doc is removed; tokens are left intact

This prevents the race condition where:
- Device A goes stale
- User logs in on Device B (stale check fires in the narrow window before
  `Accounts.onLogin` async cleanup completes)
- Device B would otherwise be logged out immediately

---

## Known Gotchas

### 1. `activityEvents` is `optional` in the schema
The schema marks `activityEvents` as optional so server-only instances don't fail validation
(the server doesn't listen for DOM events).

### 2. `staleSession.run()` is fire-and-forget on the client
In `client/main.jsx`, `run()` is called without `await` before mounting React. This is
intentional — the client `runClient()` only sets up intervals and jQuery listeners; there is
nothing async to wait for. Awaiting it would block the initial render needlessly.

### 3. `heartbeatCollection` getter is available immediately
`HeartbeatCollection` is created in the constructor, so `staleSession.heartbeatCollection`
is safe to access without calling `run()` first. The getter will throw only if the internal
collection was somehow never initialized (construction error).

### 4. jQuery and lodash.throttle are dynamically imported client-side
The client `runClient()` polls every 100 ms until both `$` (jQuery) and `throttle`
(lodash.throttle) are fully loaded before setting up the heartbeat interval. This avoids SSR
and bundle issues with these CommonJS modules.

### 5. Clock skew
`lastHeartbeat.createdAt` is a **server timestamp**. The client countdown timer uses
`new Date()` (client clock). In production with separate server/client machines, clock skew
can make the displayed countdown slightly inaccurate — the logout itself is always driven
by the server clock, so this is cosmetic only.

---

## Example App Structure

```
example/
  client/
    main.jsx          ← creates StaleSession, mounts React, exports staleSession + HEARTBEAT_METHOD_NAME
    main.html         ← Meteor HTML template (title, react-target div)
    main.css          ← minimal base styles
  server/
    main.js           ← creates StaleSession, calls run(), publishes collections, seeds user
  imports/ui/
    App.jsx           ← React Router v5 auth shell (user → Home, no user → Login)
    Home.jsx          ← dashboard: timer, heartbeat counter, activity badge, debug panel
    Login.jsx         ← login form (pre-filled with example credentials)
  settings.json       ← Meteor settings for local development
  settings-test.json  ← Meteor settings for test runs
  packages/
    stale-session/    ← the package itself (symlinked / local)
  docs/
    ai-helper.md      ← this file
```

---

## Useful Commands

```bash
# Run the example app
cd example
npm run start
# → starts on http://localhost:4000 with settings.json

# Default test user
# email: user@poplar.com
# password: user
```
