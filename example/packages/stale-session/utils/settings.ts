import { Meteor } from "meteor/meteor";

import {
  SERVER_DEFAULT_INACTIVE_TIMEOUT_MS,
  STALE_SESSION_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_COLLECTION_NAME,
  FORCE_LOGOUT,
  ACTIVITY_EVENTS,
} from "./constants";

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
} = Meteor?.settings?.public?.packages?.["stale-session"] ?? {};

export {
  inactiveTimeoutMs,
  heartbeatIntervalMs,
  forceLogout,
  activityEvents,
  heartbeatCollectionName,
};
