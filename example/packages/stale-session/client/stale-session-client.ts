import { Meteor } from "meteor/meteor";
import $ from "jquery";
import throttle from "lodash.throttle";

import { HEARTBEAT_METHOD_NAME } from "../utils/constants";

import { activityEvents, heartbeatIntervalMs } from "../utils/settings";

export class StaleSessionClient {
  logger: any;
  activityDetected: boolean;

  public constructor(logger?: Logger) {
    this.logger = logger;
    this.activityDetected = false;
  }

  private run() {
    const self = this;

    Meteor.setInterval(async () => {
      const user = await Meteor.userAsync({ fields: { _id: 1 } });

      if (user?._id && this.activityDetected) {
        try {
          await Meteor.callAsync(HEARTBEAT_METHOD_NAME, {});
        } catch (error) {
          self?.logger?.err(
            `An error occured while trying to call "users.heartbeat"`,
            {
              error,
            }
          );
        }

        self.activityDetected = false;
      }
    }, heartbeatIntervalMs);

    //
    // detect activity and mark it as detected on any of the following events
    //
    const throttledActivityDetector = throttle(() => {
      if (!self.activityDetected) {
        self.activityDetected = true;
      }
    }, 5000);

    $(document).on(activityEvents, () => {
      throttledActivityDetector();
    });
  }
}
