import SimpleSchema from "simpl-schema";

import { ValidatorContext } from "simpl-schema/dist/esm/types";

import { VALID_EVENT_TYPES } from "./constants";

function areValidEventTypes(record: ValidatorContext) {
  const eventTypes = (record?.obj?.[record.key] as string) ?? "";

  // Split the event types string by spaces
  const eventTypeArray = eventTypes
    .split(" ")
    .filter((eventType) => eventType.trim() !== "");

  // Check if every event type in the array is valid
  const valid = eventTypeArray.every((eventType) =>
    VALID_EVENT_TYPES?.includes(eventType)
  );

  if (valid) {
    return;
  }

  return SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}

export const settingsSchema = new SimpleSchema({
  inactiveTimeoutMs: {
    type: Number,
    min: 60000,
  },
  heartbeatIntervalMs: {
    type: Number,
    // 1 min
    min: 60000,
    // 5 hrs
    max: 18000000,
  },
  forceLogout: {
    type: Boolean,
  },
  heartbeatCollectionName: {
    type: String,
    min: 1,
    optional: true,
  },
  activityEvents: {
    type: String,
    custom(this) {
      return areValidEventTypes(this);
    },
  },
});
