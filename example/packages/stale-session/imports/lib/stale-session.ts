import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

declare var Package: any;

import { settingsSchema } from './utils/schemas';
import { HEARTBEAT_METHOD_NAME } from './utils/constants';
import {
  inactiveTimeoutMs,
  heartbeatIntervalMs,
  forceLogout,
  activityEvents,
  heartbeatCollectionName,
} from './utils/settings';

import type {
  Logger,
  StaleSessionConfig,
  HeartbeatCollection,
  HeartbeatResponse,
} from './types';

/**
 * StaleSession class manages both client-side activity detection and
 * server-side stale session cleanup.
 */
export class StaleSession {
  protected logger?: Logger;
  protected heartbeatIntervalMs: number;
  protected inactiveTimeoutMs: number;
  protected forceLogout: boolean;
  protected heartbeatCollectionName: string;
  protected activityEvents?: string;

  // Client-specific properties
  private activityDetected: boolean = false;

  // Server-specific properties
  private HeartbeatCollection?: Mongo.Collection<
    HeartbeatCollection,
    HeartbeatCollection
  >;

  // Static registry to avoid duplicate Mongo.Collection creation across multiple instances
  private static collectionRegistry = new Map<
    string,
    Mongo.Collection<HeartbeatCollection, HeartbeatCollection>
  >();

  public constructor(config?: Partial<StaleSessionConfig>, logger?: Logger) {
    this.logger = logger;

    // Use settings from utils/settings as defaults, override with config if provided
    this.heartbeatIntervalMs =
      config?.heartbeatIntervalMs ?? heartbeatIntervalMs;
    this.inactiveTimeoutMs = config?.inactiveTimeoutMs ?? inactiveTimeoutMs;
    this.forceLogout = config?.forceLogout ?? forceLogout;
    this.heartbeatCollectionName =
      config?.heartbeatCollectionName ?? heartbeatCollectionName;
    this.activityEvents = config?.activityEvents ?? activityEvents;

    this.HeartbeatCollection = this.createHeartbeatCollection();

    this.validateConfig();
  }

  /**
   * Validates the current configuration against the defined schema.
   */
  protected validateConfig(): void {
    const configToValidate: Partial<StaleSessionConfig> = {
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      inactiveTimeoutMs: this.inactiveTimeoutMs,
      forceLogout: this.forceLogout,
      heartbeatCollectionName: this.heartbeatCollectionName,
    };

    if (this.activityEvents) {
      configToValidate.activityEvents = this.activityEvents;
    }

    try {
      settingsSchema.validate(configToValidate);
    } catch (error) {
      this.logger?.error?.('Invalid configuration:', error);
      throw error;
    }
  }

  protected logInfo(message: string, ...args: unknown[]): void {
    this.logger?.log?.(message, ...args);
  }

  protected logWarning(message: string, ...args: unknown[]): void {
    this.logger?.warn?.(message, ...args);
  }

  protected logError(message: string, ...args: unknown[]): void {
    this.logger?.error?.(message, ...args) ||
      this.logger?.err?.(message, ...args);
  }

  /**
   * Unified run method that initializes client or server behavior.
   */
  public async run(): Promise<void> {
    if (Meteor.isClient) {
      this.runClient();
      this.logInfo('StaleSession started on client');
      return;
    }

    if (Meteor.isServer) {
      await this.runServer();
      this.logInfo('StaleSession started on server');
    }
  }

  // Client-side implementation
  private runClient(): void {
    const self = this;

    // Send heartbeats to the server if activity was detected
    Meteor.setInterval(async () => {
      const user = Meteor.user({ fields: { _id: 1 } });

      if (user?._id && this.activityDetected) {
        try {
          await Meteor.callAsync(HEARTBEAT_METHOD_NAME, {});
        } catch (error) {
          self.logError(
            `An error occurred while trying to call "${HEARTBEAT_METHOD_NAME}"`,
            { error },
          );
        }

        self.activityDetected = false;
      }
    }, this.heartbeatIntervalMs);

    /**
     * Native activity detection without external dependencies.
     * Uses a simple throttle mechanism to reduce overhead.
     */
    let throttled = false;
    const onActivity = () => {
      if (throttled) return;
      throttled = true;
      setTimeout(() => { throttled = false; }, 5000); // 5s throttle

      if (!self.activityDetected) {
        self.activityDetected = true;
      }
    };

    const events = (this.activityEvents || activityEvents).split(' ');
    for (const event of events) {
      document.addEventListener(event, onActivity, { passive: true });
    }

    self.logInfo(`StaleSession client started with events: ${events.join(' ')}`);
  }

  // Server-side implementation
  private async runServer(): Promise<void> {
    this.addHeartbeatMethod();
    this.addLoginCleanupHook();
    this.runStaleSession();

    this.logInfo('StaleSession server started successfully');
  }

  // Client-specific methods
  public isActivityDetected(): boolean {
    if (!Meteor.isClient) {
      throw new Error('isActivityDetected() is only available on the client');
    }
    return this.activityDetected;
  }

  public markActivityDetected(): void {
    if (!Meteor.isClient) {
      throw new Error('markActivityDetected() is only available on the client');
    }
    this.activityDetected = true;
  }

  get heartbeatCollection(): Mongo.Collection<HeartbeatCollection> {
    if (!this.HeartbeatCollection) {
      throw new Error('HeartbeatCollection not initialized. Call run() first.');
    }
    return this.HeartbeatCollection;
  }

  // Server-specific methods
  private runStaleSession(): void {
    if (!Meteor.isServer) return;
    if (!this.forceLogout) {
      this.logInfo(`"forceLogout" is false, stale session is disabled!`);
      return;
    }

    Meteor.setInterval(async () => {
      const nowTs = new Date().getTime();
      const overdueTimestamp = nowTs - this.inactiveTimeoutMs;

      const heartbeatQuery = {
        createdAt: { $lte: new Date(overdueTimestamp) },
      };

      const heartbeats = await this.HeartbeatCollection?.find(heartbeatQuery, {
        fields: { userId: 1, sessionId: 1, createdAt: 1 },
      })?.fetchAsync();

      if (!heartbeats?.length) return;

      for (const heartbeat of heartbeats) {
        /**
         * Re-check whether the specific session is still fresh.
         * If the heartbeat is stale, we check if the specific login token still exists
         * and hasn't been updated since the heartbeat was recorded.
         */
        const user = await Meteor.users.findOneAsync(
          { _id: heartbeat.userId },
          { fields: { 'services.resume.loginTokens': 1 } },
        );

        const loginTokens: { when: Date | string; hashedToken: string }[] =
          (user as any)?.services?.resume?.loginTokens ?? [];

        // If we have a sessionId, we target only that specific session
        if (heartbeat.sessionId) {
          const specificToken = loginTokens.find((t) => t.hashedToken === heartbeat.sessionId);

          if (!specificToken) {
            // Token already gone (e.g. manual logout), just cleanup heartbeat
            await this.HeartbeatCollection!.removeAsync(heartbeat._id);
            continue;
          }

          const tokenDate = new Date(specificToken.when);
          
          // Safety: If the token itself is newer than the stale activity,
          // it belongs to a new session (e.g. re-auth on same device) or re-login.
          if (tokenDate.getTime() > heartbeat.createdAt.getTime() || tokenDate.getTime() > overdueTimestamp) {
            await this.HeartbeatCollection!.removeAsync(heartbeat._id);
            continue;
          }

          // Surgically remove only the stale session token
          this.logInfo(`Logging out stale session ${heartbeat.sessionId} for user ${heartbeat.userId}`);
          await Meteor.users.updateAsync(
            { _id: heartbeat.userId },
            { $pull: { 'services.resume.loginTokens': { hashedToken: specificToken.hashedToken } } as any }
          );
          await this.HeartbeatCollection!.removeAsync(heartbeat._id);
        } else {
          // Legacy heartbeat without sessionId: revert to "all sessions" check
          const hasFreshTokens = loginTokens.some((token) => {
            const tokenDate = new Date(token.when);
            return tokenDate.getTime() > overdueTimestamp || tokenDate.getTime() > heartbeat.createdAt.getTime();
          });

          if (!hasFreshTokens) {
            this.logInfo(`Logging out user ${heartbeat.userId} (legacy stale heartbeat)`);
            await Meteor.users.updateAsync(
              { _id: heartbeat.userId },
              { $set: { 'services.resume.loginTokens': [] } }
            );
          }
          await this.HeartbeatCollection!.removeAsync(heartbeat._id);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private createHeartbeatCollection(): Mongo.Collection<HeartbeatCollection> {
    if (this.HeartbeatCollection) return this.HeartbeatCollection;

    const name = this.heartbeatCollectionName;
    const existing = StaleSession.collectionRegistry.get(name);
    if (existing) {
      this.logInfo(`Reusing existing heartbeat collection: ${name}`);
      return existing;
    }

    try {
      const collection = new Mongo.Collection<HeartbeatCollection>(name);
      StaleSession.collectionRegistry.set(name, collection);
      this.logInfo(`Created heartbeat collection: ${name}`);
      return collection;
    } catch (error) {
      this.logError(`Error creating heartbeat collection "${name}":`, error);
      throw error;
    }
  }

  private addHeartbeatMethod(): void {
    const self = this;

    try {
      Meteor.methods({
        async [HEARTBEAT_METHOD_NAME](): Promise<
          HeartbeatResponse | undefined
        > {
          const userId = Meteor.userId();
          if (!userId) return;

          // Extract session ID directly (it is already the hash)
          let sessionId: string | undefined;
          if (Meteor.isServer && this.connection && typeof Package !== 'undefined' && Package['accounts-base']) {
             const Accounts = Package['accounts-base'].Accounts;
             sessionId = Accounts._getLoginToken(this.connection.id);
          }

          try {
            const query: any = { userId };
            if (sessionId) query.sessionId = sessionId;

            await self.HeartbeatCollection?.removeAsync(query);

            const createdAt = new Date();
            const _id = await self.HeartbeatCollection?.insertAsync({
              userId,
              sessionId,
              createdAt,
            });

            return { _id: _id!, createdAt };
          } catch (error) {
            self.logError(`Error processing heartbeat for user ${userId}:`, error);
            throw error;
          }
        },
      });

      this.logInfo(`Registered heartbeat method: ${HEARTBEAT_METHOD_NAME}`);
    } catch (error) {
        this.logWarning(`${HEARTBEAT_METHOD_NAME} method registration skipped (likely already exists)`);
    }
  }

  private addLoginCleanupHook(): void {
    const self = this;

    try {
      if (typeof Package !== 'undefined' && Package['accounts-base']) {
        const Accounts = Package['accounts-base'].Accounts;
        Accounts.onLogin(async (info: any) => {
          if (info.user?._id) {
            const sessionId = Accounts._getLoginToken(info.connection.id);
            await self.cleanupUserHeartbeats(info.user._id, sessionId);
          }
        });
        this.logInfo('Registered login cleanup hook via Accounts.onLogin');
      }
    } catch (error) {
      this.logWarning('Could not register login cleanup hook:', error);
    }
  }

  private async cleanupUserHeartbeats(userId: string, sessionId?: string): Promise<void> {
    try {
      const query: any = { userId };
      if (sessionId) query.sessionId = sessionId;
      await this.HeartbeatCollection?.removeAsync(query);
    } catch (error) {
      this.logError(`Error cleaning up heartbeats for user ${userId}:`, error);
    }
  }

  // Getters for configuration
  public getHeartbeatInterval(): number { return this.heartbeatIntervalMs; }
  public getInactiveTimeout(): number { return this.inactiveTimeoutMs; }
  public isForceLogoutEnabled(): boolean { return this.forceLogout; }
  public getHeartbeatCollectionName(): string { return this.heartbeatCollectionName; }
  public getActivityEvents(): string | undefined { return this.activityEvents; }

  // Manual cleanup for specific scenarios
  public async cleanupUserHeartbeatsManual(userId: string, sessionId?: string): Promise<number> {
    if (!Meteor.isServer) {
        throw new Error('cleanupUserHeartbeatsManual() is only available on the server');
    }
    if (!this.HeartbeatCollection) {
        throw new Error('HeartbeatCollection not initialized');
    }
    const query: any = { userId };
    if (sessionId) query.sessionId = sessionId;
    return (await this.HeartbeatCollection.removeAsync(query)) || 0;
  }
}
