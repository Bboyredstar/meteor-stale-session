// Interval (in ms) at which activity heartbeats are sent up to the server
const SERVER_DEFAULT_INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

/* Server constants */

// Interval (in ms) at which stale sessions are purged i.e. found and forcibly logged out
const STALE_SESSION_HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; //3 min

// Whether or not we want to force log out and purge stale sessions
const FORCE_LOGOUT = false;

const DEFAULT_HEARTBEAT_COLLECTION_NAME = "heartbeat";

/* Client constants */

// the jquery events which are considered indicator of activity e.g. in an on() call.
const ACTIVITY_EVENTS = "mousemove click keydown";

const VALID_EVENT_TYPES = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "keydown",
  "keypress",
  "keyup",
  "focus",
  "blur",
  "change",
  "select",
  "submit",
  "scroll",
  "resize",
  "contextmenu",
  "touchstart",
  "touchmove",
  "touchend",
];

const HEARTBEAT_METHOD_NAME = "heartbeat";

export {
  DEFAULT_HEARTBEAT_COLLECTION_NAME,
  SERVER_DEFAULT_INACTIVE_TIMEOUT_MS,
  STALE_SESSION_HEARTBEAT_INTERVAL_MS,
  FORCE_LOGOUT,
  ACTIVITY_EVENTS,
  VALID_EVENT_TYPES,
  HEARTBEAT_METHOD_NAME,
};
