// Logger interface with optional methods
export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  err?: (...args: unknown[]) => void; // Alternative error method
}

// Configuration interface for stale session settings
export interface StaleSessionConfig {
  heartbeatIntervalMs: number;
  inactiveTimeoutMs: number;
  forceLogout: boolean;
  heartbeatCollectionName: string;
  activityEvents?: string;
}

// Client-specific configuration
export interface StaleSessionClientConfig
  extends Pick<StaleSessionConfig, 'heartbeatIntervalMs' | 'activityEvents'> {}

// Server-specific configuration
export interface StaleSessionServerConfig
  extends Omit<StaleSessionConfig, 'activityEvents'> {}

// Heartbeat document interface
export interface HeartbeatCollection {
  _id: string;
  userId: string;
  sessionId?: string; // Hashed login token
  createdAt: Date;
}

// Heartbeat method response
export interface HeartbeatResponse {
  _id: string;
  createdAt: Date;
}

// Base class interface
export interface IStaleSessionBase {
  run(): void | Promise<void>;
  getHeartbeatInterval(): number;
  getInactiveTimeout(): number;
  isForceLogoutEnabled(): boolean;
  getHeartbeatCollectionName(): string;
  getActivityEvents(): string | undefined;
}
