import type { Mongo } from 'meteor/mongo';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  err?: (...args: unknown[]) => void;
}

export interface StaleSessionConfig {
  heartbeatIntervalMs: number;
  inactiveTimeoutMs: number;
  forceLogout: boolean;
  heartbeatCollectionName: string;
  activityEvents?: string;
}

/** Client-specific config subset */
export interface StaleSessionClientConfig
  extends Pick<StaleSessionConfig, 'heartbeatIntervalMs' | 'activityEvents'> {}

/** Server-specific config subset */
export interface StaleSessionServerConfig
  extends Omit<StaleSessionConfig, 'activityEvents'> {}

export interface HeartbeatCollection {
  _id: string;
  userId: string;
  createdAt: Date;
}

export interface HeartbeatResponse {
  _id: string;
  createdAt: Date;
}

// ─── Main class ────────────────────────────────────────────────────────────

export declare class StaleSession {
  constructor(config?: Partial<StaleSessionConfig>, logger?: Logger);

  /** Start monitoring. Detects client vs server automatically. */
  run(): Promise<void>;

  // ── Getters ──────────────────────────────────────────────────────────────
  getHeartbeatInterval(): number;
  getInactiveTimeout(): number;
  isForceLogoutEnabled(): boolean;
  getHeartbeatCollectionName(): string;
  getActivityEvents(): string | undefined;

  // ── Client-only ──────────────────────────────────────────────────────────
  /** @throws if called on the server */
  isActivityDetected(): boolean;
  /** @throws if called on the server */
  markActivityDetected(): void;

  // ── Server-only ──────────────────────────────────────────────────────────
  /** Access the underlying MongoDB heartbeat collection. */
  get heartbeatCollection(): Mongo.Collection<HeartbeatCollection>;
  /** Manually remove all heartbeats for a user. @throws if called on the client */
  cleanupUserHeartbeatsManual(userId: string): Promise<number>;
}

// ─── Legacy aliases (backward compat) ──────────────────────────────────────
export declare class StaleSessionClient extends StaleSession {}
export declare class StaleSessionServer extends StaleSession {}

// ─── Type aliases ──────────────────────────────────────────────────────────
export type StaleSessionType = StaleSession;
export type StaleSessionConfigType = StaleSessionConfig;
export type LoggerType = Logger;
export type HeartbeatCollectionType = HeartbeatCollection;
export type HeartbeatResponseType = HeartbeatResponse;

// ─── Constants ─────────────────────────────────────────────────────────────
export declare const HEARTBEAT_METHOD_NAME: string;

// ─── Settings helpers ──────────────────────────────────────────────────────
export declare const inactiveTimeoutMs: number;
export declare const heartbeatIntervalMs: number;
export declare const forceLogout: boolean;
export declare const activityEvents: string;
export declare const heartbeatCollectionName: string;
