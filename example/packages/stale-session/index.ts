// Export the unified class and types
export { StaleSession } from './imports/lib/stale-session';
export type {
  StaleSessionConfig,
  StaleSessionClientConfig,
  StaleSessionServerConfig,
  Logger,
  HeartbeatCollection,
  HeartbeatResponse,
} from './imports/lib/types';

// Export constants for external use
export { HEARTBEAT_METHOD_NAME } from './imports/lib/utils/constants';

// Export settings for configuration
export {
  inactiveTimeoutMs,
  heartbeatIntervalMs,
  forceLogout,
  activityEvents,
  heartbeatCollectionName,
} from './imports/lib/utils/settings';

// Legacy exports for backward compatibility
export { StaleSession as StaleSessionClient } from './imports/lib/stale-session';
export { StaleSession as StaleSessionServer } from './imports/lib/stale-session';
