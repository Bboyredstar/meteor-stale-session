import { Meteor } from 'meteor/meteor';

import {
  SERVER_DEFAULT_INACTIVE_TIMEOUT_MS,
  STALE_SESSION_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_COLLECTION_NAME,
  FORCE_LOGOUT,
  ACTIVITY_EVENTS,
} from './constants';

const {
  inactiveTimeoutMs = SERVER_DEFAULT_INACTIVE_TIMEOUT_MS,
  heartbeatIntervalMs = STALE_SESSION_HEARTBEAT_INTERVAL_MS,
  forceLogout = FORCE_LOGOUT,
  activityEvents = ACTIVITY_EVENTS,
  heartbeatCollectionName = DEFAULT_HEARTBEAT_COLLECTION_NAME,
}: {
  inactiveTimeoutMs: number;
  heartbeatIntervalMs: number;
  forceLogout: boolean;
  activityEvents: string;
  heartbeatCollectionName: string;
} = Meteor?.settings?.public?.packages?.['stale-session'] ?? {};

// Maximum time in milliseconds that a user session can remain inactive before being considered stale.
// After this timeout period, the session will be eligible for cleanup/logout if forceLogout is enabled.
// Default: 1,800,000 (30 minutes)
export { inactiveTimeoutMs };

// Interval in milliseconds at which the server checks for and purges stale sessions.
// This is also the frequency at which client-side heartbeats are sent to the server.
// Default: 180,000 (3 minutes)
export { heartbeatIntervalMs };

// Whether to automatically force logout users with stale sessions.
// When true, users who exceed the inactiveTimeoutMs will be forcibly logged out.
// Default: false
export { forceLogout };

// Space-separated string of DOM events that are considered indicators of user activity.
// These events are monitored on the client-side to determine if a user is actively using the application.
// Default: 'mousemove click keydown'
export { activityEvents };

// Name of the MongoDB collection used to store session heartbeat data on the server.
// This collection tracks active sessions and their last activity timestamps.
// Default: 'heartbeat'
export { heartbeatCollectionName };
