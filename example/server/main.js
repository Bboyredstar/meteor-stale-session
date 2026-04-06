import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { StaleSession } from 'meteor/bboyredstar:stale-session';

Meteor.startup(async () => {
  // The StaleSession will automatically pick up configuration from:
  // Meteor.settings.public.packages['stale-session']
  const staleSessionFromSettings = new StaleSession(undefined, console);

  // Use the settings-based configuration for this example
  await staleSessionFromSettings.run();

  // Publish heartbeats for testing dashboard
  Meteor.publish('staleSessionHeartbeats', function () {
    if (!this.userId) {
      return this.ready();
    }

    return staleSessionFromSettings.heartbeatCollection.find(
      { userId: this.userId },
      { fields: { userId: 1, createdAt: 1 } }
    );
  });

  if ((await Meteor.users.find().countAsync()) === 0) {
    // Create user account
    await Accounts.createUserAsync({
      username: 'user',
      email: 'user@poplar.com',
      password: 'user',
    });
  }

  Meteor.publish('user', function () {
    return Meteor.users.find({
      _id: this.userId,
    });
  });
});
