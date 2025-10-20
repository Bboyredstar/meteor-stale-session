// Only declare modules for dynamic imports that don't have proper ESM support
declare module 'jquery' {
  const jQuery: any;
  export default jQuery;
}

declare module 'lodash.throttle' {
  const throttle: any;
  export default throttle;
}

declare module 'meteor/bboyredstar:stale-session' {
  import type { Mongo } from 'meteor/mongo';

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

  export interface HeartbeatCollection {
    _id: string;
    userId: string;
    createdAt: Date;
  }

  export interface HeartbeatResponse {
    _id: string;
    createdAt: Date;
  }

  export class StaleSession {
    constructor(config?: Partial<StaleSessionConfig>, logger?: Logger);
    run(): Promise<void>;

    getHeartbeatInterval(): number;
    getInactiveTimeout(): number;
    isForceLogoutEnabled(): boolean;
    getHeartbeatCollectionName(): string;
    getActivityEvents(): string | undefined;

    isActivityDetected(): boolean;
    markActivityDetected(): void;
    getCollection(): Mongo.Collection<HeartbeatCollection>;
    cleanupUserHeartbeatsManual(userId: string): Promise<number>;
  }

  export class StaleSessionClient extends StaleSession {}
  export class StaleSessionServer extends StaleSession {}

  // Type aliases for easier import
  export type StaleSessionType = StaleSession;
  export type StaleSessionConfigType = StaleSessionConfig;
  export type LoggerType = Logger;
  export type HeartbeatCollectionType = HeartbeatCollection;
  export type HeartbeatResponseType = HeartbeatResponse;
}
