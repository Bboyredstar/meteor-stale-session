# Changelog

All notable changes to `bboyredstar:stale-session` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-04-06

### Fixed

- **Critical: force-logout was ejecting ALL users on every stale-session poll.**
  The `$pull` query `{ when: { $exists: true } }` matches every login token
  (all Meteor tokens have a `when` field), so the update was wiping
  `services.resume.loginTokens` for every user in `disconnectedUsersIds` on
  every server interval tick, whether or not they had actually timed out.
  Replaced with an explicit `$set: { 'services.resume.loginTokens': [] }`
  scoped strictly to users whose heartbeat has crossed the inactivity threshold.

- **Critical: duplicate `staleSessionHeartbeats` Meteor publication.**
  `server/main.js` registered the same publication name twice. Meteor uses only
  the last registration and warns in the log. The second registration was also
  missing `return` before `this.ready()`, causing the cursor to fall through and
  call `.find({ userId: null })` for unauthenticated subscribers, leaking
  heartbeat data. Removed the duplicate; the first registration was correct.

- **Multi-device race condition: active sessions could be wiped when a stale
  session was cleaned up.**
  When a user had a stale heartbeat on Device A and then logged in on Device B,
  the `Accounts.onLogin` async cleanup hook raced with the stale-session poll.
  If the poll fired in the narrow window before the hook removed the stale doc,
  the user's brand-new Device B session was also logged out (all tokens wiped).
  The stale-session poll now loads the user's current `loginTokens` before
  acting: if any token has `when > heartbeat.createdAt` the user has
  re-authenticated after the heartbeat was recorded and is skipped — only the
  stale heartbeat doc is removed, tokens are left intact.

- **`activityEvents` not marked optional in SimpleSchema, causing server-side
  instantiation to throw a validation error.**
  Server instances of `StaleSession` do not use DOM events, so `activityEvents`
  is legitimately absent. Added `optional: true` to the schema field so
  server-only usage no longer fails validation.

### Changed

- `inactiveTimeoutMs` example default changed from `30 000 ms` (30 s) to
  `300 000 ms` (5 min). Having `inactiveTimeoutMs === heartbeatIntervalMs` gave
  users a zero grace period — the stale check fired on the same tick the
  heartbeat expired. The recommended minimum ratio is 5–10 × the heartbeat
  interval.

- `runStaleSession` now fetches `createdAt` from heartbeat documents (previously
  only `userId` was projected) to enable the multi-device re-auth guard above.

- Log message on successful stale-session processing now reports both the number
  of heartbeat docs removed and the number of users logged out separately:
  `Processed N stale heartbeat(s), logged out M user(s)`.

---

## [0.0.5] — initial release

First public release of the unified `StaleSession` class supporting both Meteor 2
and Meteor 3.
