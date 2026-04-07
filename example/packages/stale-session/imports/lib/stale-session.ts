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

// Dynamic imports for client-only dependencies
let $: any;
let throttle: any;

if (Meteor.isClient) {
  // Dynamic imports for client-side only
  import('jquery').then((jQuery) => {
    $ = jQuery.default;
  });

  import('lodash.throttle').then((throttleModule) => {
    throttle = throttleModule.default;
  });
}

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

  // Unified run method that determines client vs server behavior
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

    // Wait for dynamic imports to complete
    const waitForImports = () => {
      if (!$ || !throttle) {
        setTimeout(waitForImports, 100);
        return;
      }

      Meteor.setInterval(async () => {
        const user = Meteor.user({ fields: { _id: 1 } });

        if (user?._id && this.activityDetected) {
          try {
            await Meteor.callAsync(HEARTBEAT_METHOD_NAME, {});
            !Meteor.isProduction &&
              self.logInfo(`Heartbeat sent for user ${user._id}`);
          } catch (error) {
            self.logError(
              `An error occurred while trying to call "${HEARTBEAT_METHOD_NAME}"`,
              { error },
            );
          }

          self.activityDetected = false; // Сбрасываем флаг активности
        }
      }, this.heartbeatIntervalMs);

      // Detect activity and mark it as detected on any of the following events
      const throttledActivityDetector = throttle(() => {
        if (!self.activityDetected) {
          self.activityDetected = true;
          self.logInfo('User activity detected');
        }
      }, 5000);

      const events = this.activityEvents || activityEvents;
      $(document).on(events, () => {
        throttledActivityDetector();
      });

      self.logInfo(`StaleSession client started with events: ${events}`);
    };

    waitForImports();
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
    if (!this.forceLogout) {
      this.logInfo(`"forceLogout" is false, stale session is disabled!`);
      return;
    }

    Meteor.setInterval(async () => {
      const overdueTimestamp = new Date().getTime() - this.inactiveTimeoutMs;

      const heartbeatQuery = {
        createdAt: { $lte: new Date(overdueTimestamp) },
      };

      const heartbeats = await this.HeartbeatCollection?.find(heartbeatQuery, {
        fields: { userId: 1, createdAt: 1 },
      })?.fetchAsync();

      if (!heartbeats?.length) {
        return;
      }

      const heartbeatIdsToRemove: string[] = [];
      const userIdsToLogout: string[] = [];

      for (const heartbeat of heartbeats) {
        // Re-check whether the user has logged in on another device AFTER this
        // heartbeat was recorded. If any login token is newer than the stale
        // heartbeat's createdAt, the user re-authenticated and must not be
        // logged out — the onLogin hook will have already cleaned up the stale
        // heartbeat doc asynchronously, but we guard here too to close the race.
        const user = await Meteor.users.findOneAsync(
          { _id: heartbeat.userId },
          { fields: { 'services.resume.loginTokens': 1 } },
        );

        const loginTokens: { when: Date | string }[] =
          (user as any)?.services?.resume?.loginTokens ?? [];

        const hasNewerSession = loginTokens.some((token) => {
          const tokenDate = new Date(token.when);
          return tokenDate > heartbeat.createdAt;
        });

        if (hasNewerSession) {
          // User has logged in after this heartbeat was created — they have an
          // active session on another device. Only remove the stale heartbeat
          // doc; do NOT wipe their tokens.
          this.logInfo(
            `Skipping logout for user ${heartbeat.userId}: active session found after stale heartbeat`,
          );
          heartbeatIdsToRemove.push(heartbeat._id);
        } else {
          heartbeatIdsToRemove.push(heartbeat._id);
          userIdsToLogout.push(heartbeat.userId);
        }
      }

      this.logInfo(
        `Removing session tokens for: ${userIdsToLogout.join(', ')}`,
      );

      try {
        if (userIdsToLogout.length > 0) {
          await Meteor.users.updateAsync(
            { _id: { $in: userIdsToLogout } },
            { $set: { 'services.resume.loginTokens': [] } },
            { multi: true },
          );
        }

        await this.HeartbeatCollection!.removeAsync({
          _id: { $in: heartbeatIdsToRemove },
        });

        this.logInfo(
          `Processed ${heartbeatIdsToRemove.length} stale heartbeat(s), logged out ${userIdsToLogout.length} user(s)`,
        );
      } catch (error) {
        this.logError('Error processing stale sessions:', error);
      }
    }, this.heartbeatIntervalMs);
  }

  private createHeartbeatCollection(): Mongo.Collection<HeartbeatCollection> {
    if (this.HeartbeatCollection) {
      return this.HeartbeatCollection;
    }
    try {
      const HeartbeatCollection = new Mongo.Collection<HeartbeatCollection>(
        this.heartbeatCollectionName,
      );

      this.logInfo(
        `Created heartbeat collection: ${this.heartbeatCollectionName}`,
      );
      return HeartbeatCollection;
    } catch (error) {
      this.logError('Error creating heartbeat collection:', error);
      throw error;
    }
  }

  private addHeartbeatMethod(): void {
    const self = this;

    // Check if method already exists (simplified check for unified class)
    try {
      Meteor.methods({
        async [HEARTBEAT_METHOD_NAME](): Promise<
          HeartbeatResponse | undefined
        > {
          const userId = Meteor.userId();
          if (!userId) {
            return;
          }

          self.logInfo(`Detected heartbeat from user ${userId}`);

          try {
            // Always remove possible old entities from this user
            // This ensures cleanup happens even if login hooks don't work
            const removedCount = await self.HeartbeatCollection?.removeAsync({
              userId,
            });

            if (removedCount && removedCount > 0) {
              self.logInfo(
                `Cleaned up ${removedCount} old heartbeat(s) for user ${userId}`,
              );
            }

            const createdAt = new Date();
            const _id = await self.HeartbeatCollection?.insertAsync({
              userId,
              createdAt,
            });

            return { _id: _id!, createdAt };
          } catch (error) {
            self.logError(
              `Error processing heartbeat for user ${userId}:`,
              error,
            );
            throw error;
          }
        },
      });

      this.logInfo(`Registered heartbeat method: ${HEARTBEAT_METHOD_NAME}`);
    } catch (error) {
      this.logWarning(
        `${HEARTBEAT_METHOD_NAME} method may already exist:`,
        error,
      );
    }
  }

  private addLoginCleanupHook(): void {
    const self = this;

    // Hook into user login to clean up old heartbeats
    try {
      // Try to use Accounts.onLogin if accounts-base package is available
      if (typeof Package !== 'undefined' && Package['accounts-base']) {
        const Accounts = Package['accounts-base'].Accounts;
        Accounts.onLogin(async (info: any) => {
          if (info.user?._id) {
            await self.cleanupUserHeartbeats(info.user._id);
          }
        });
        this.logInfo('Registered login cleanup hook via Accounts.onLogin');
      } else {
        this.logWarning(
          'accounts-base package not available, login cleanup hook not registered',
        );
      }
    } catch (error) {
      this.logWarning('Could not register login cleanup hook:', error);
    }
  }

  private async cleanupUserHeartbeats(userId: string): Promise<void> {
    try {
      const removedCount = await this.HeartbeatCollection?.removeAsync({
        userId: userId,
      });

      if (removedCount && removedCount > 0) {
        this.logInfo(
          `Cleaned up ${removedCount} old heartbeat(s) for user ${userId} on login`,
        );
      }
    } catch (error) {
      this.logError(`Error cleaning up heartbeats for user ${userId}:`, error);
    }
  }

  // Getters for configuration
  public getHeartbeatInterval(): number {
    return this.heartbeatIntervalMs;
  }

  public getInactiveTimeout(): number {
    return this.inactiveTimeoutMs;
  }

  public isForceLogoutEnabled(): boolean {
    return this.forceLogout;
  }

  public getHeartbeatCollectionName(): string {
    return this.heartbeatCollectionName;
  }

  public getActivityEvents(): string | undefined {
    return this.activityEvents;
  }

  // Cleanup methods
  public async cleanupUserHeartbeatsManual(userId: string): Promise<number> {
    if (!Meteor.isServer) {
      throw new Error(
        'cleanupUserHeartbeatsManual() is only available on the server',
      );
    }
    if (!this.HeartbeatCollection) {
      throw new Error('HeartbeatCollection not initialized. Call run() first.');
    }

    try {
      const removedCount = await this.HeartbeatCollection.removeAsync({
        userId: userId,
      });

      if (removedCount && removedCount > 0) {
        this.logInfo(
          `Manually cleaned up ${removedCount} heartbeat(s) for user ${userId}`,
        );
      }

      return removedCount || 0;
    } catch (error) {
      this.logError(
        `Error manually cleaning up heartbeats for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
