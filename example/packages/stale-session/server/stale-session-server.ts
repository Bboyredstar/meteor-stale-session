import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";

import { settingsSchema } from "../utils/schemas";

import { HEARTBEAT_METHOD_NAME } from "../utils/constants";

import {
  inactiveTimeoutMs,
  heartbeatIntervalMs,
  forceLogout,
  heartbeatCollectionName,
} from "../utils/settings";

export class StaleSessionServer {
  private HeartbeatCollection?: Mongo.Collection<
    HeartbeatCollection,
    HeartbeatCollection
  >;
  heartbeatIntervalMs: number;
  inactiveTimeoutMs: number;
  forceLogout: boolean;
  logger: Logger | undefined;
  heartbeatCollectionName: string;

  public constructor(logger?: Logger) {
    this.validateParams({
      heartbeatIntervalMs,
      inactiveTimeoutMs,
      forceLogout,
      heartbeatCollectionName,
    });

    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.inactiveTimeoutMs = inactiveTimeoutMs;
    this.forceLogout = forceLogout;
    this.logger = logger;
    this.heartbeatCollectionName = heartbeatCollectionName;
  }

  private validateParams(
    params: Pick<
      StaleSessionServer,
      | "heartbeatIntervalMs"
      | "inactiveTimeoutMs"
      | "forceLogout"
      | "heartbeatCollectionName"
    >
  ) {
    const schema = settingsSchema.omit("activityEvents");

    schema.validate(params);
  }

  public async run() {
    await this.createHeartbeatCollection();
    this.addHeartbeatMethod();
    this.runStaleSession();
  }

  public getCollection() {
    return this.HeartbeatCollection;
  }

  private runStaleSession() {
    if (this.forceLogout === false) {
      this?.logger?.log(`"forceLogout" is false, stale session is disabled!`);
      return;
    }

    Meteor.setInterval(async () => {
      const overdueTimestamp = new Date().getTime() - this.inactiveTimeoutMs;

      const heartbeatQuery = {
        createdAt: { $lte: new Date(overdueTimestamp) },
      };

      const heartbeats = await this?.HeartbeatCollection?.find(heartbeatQuery, {
        fields: { userId: 1 },
      })?.fetchAsync();

      if (!heartbeats?.length) {
        return;
      }

      const heartbeatIds: string[] = [];
      const disconnectedUsersIds: string[] = [];

      heartbeats?.forEach((heartbeat) => {
        heartbeatIds.push(heartbeat?._id);
        disconnectedUsersIds.push(heartbeat?.userId);
      });

      // Log users that are getting interactive session tokens removed
      this.logger?.log(
        `Removing interactive session tokens for: ${disconnectedUsersIds.join(
          ", "
        )}`
      );

      // Remove the session tokens
      await Meteor.users.updateAsync(
        // Find all the users who have an overdue heartbeat
        { _id: { $in: disconnectedUsersIds } },

        // Remove all of the loginTokens that came from the Web UI
        {
          $pull: { "services.resume.loginTokens": { when: { $exists: true } } },
        },
        { multi: true }
      );

      await this.HeartbeatCollection!.removeAsync({
        _id: { $in: heartbeatIds },
      });
    }, this.heartbeatIntervalMs);
  }

  private async createHeartbeatCollection() {
    if (!this.HeartbeatCollection) {
      const HeartbeatCollection = new Mongo.Collection<HeartbeatCollection>(
        this.heartbeatCollectionName
      );

      await HeartbeatCollection.createIndexAsync({
        createdAt: 1,
        userId: 1,
      });

      this.HeartbeatCollection = HeartbeatCollection;
    }
  }

  private addHeartbeatMethod() {
    const self = this;

    if (Meteor?.server?.method_handlers?.[HEARTBEAT_METHOD_NAME]) {
      self?.logger?.warn(
        `${HEARTBEAT_METHOD_NAME} method already exists in Meteor method handlers!`
      );
      return;
    }

    Meteor.methods({
      async [HEARTBEAT_METHOD_NAME]() {
        const user = await Meteor.userAsync({ fields: { _id: 1 } });

        if (!user) {
          return;
        }

        self?.logger?.log(`Detected heartbeat from the user ${user._id}`);

        const createdAt = new Date();
        const _id = await self?.HeartbeatCollection?.insertAsync({
          userId: user._id,
          createdAt,
        });

        return { _id, createdAt };
      },
    });
  }
}
