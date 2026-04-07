import SimpleSchema from 'simpl-schema';

import type { ValidatorContext } from 'simpl-schema/dist/esm/types';

import { VALID_EVENT_TYPES } from './constants';

function areValidEventTypes(record: ValidatorContext) {
  const eventTypes = (record?.obj?.[record.key] as string) ?? '';

  // Split the event types string by spaces
  const eventTypeArray = eventTypes
    .split(' ')
    .filter((eventType) => eventType.trim() !== '');

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
    // 5 seconds
    min: 5000,
  },
  heartbeatIntervalMs: {
    type: Number,
    // 5 seconds
    min: 5000,
    custom(this: ValidatorContext) {
      const heartbeat = this.value as number;
      const timeout = this.obj.inactiveTimeoutMs as number;

      if (heartbeat >= timeout) {
        return 'heartbeatMustBeLessThanTimeout';
      }
    },
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
    optional: true,
    custom(this: ValidatorContext) {
      return areValidEventTypes(this);
    },
  },
});
