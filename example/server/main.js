import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { LinksCollection } from "/imports/api/links";
import { StaleSessionServer } from "meteor/bboyredstar:stale-session";

async function insertLink({ title, url }) {
  await LinksCollection.insertAsync({ title, url, createdAt: new Date() });
}

Meteor.startup(async () => {
  await new StaleSessionServer(console).run();
  
  if ((await Meteor.users.find().countAsync()) === 0) {
    // Create user account
    await Accounts.createUserAsync({
      username: "user",
      email: "user@poplar.com",
      password: "user",
    });
  }

  // If the Links collection is empty, add some data.
  if ((await LinksCollection.find().countAsync()) === 0) {
    await insertLink({
      title: "Do the Tutorial",
      url: "https://react-tutorial.meteor.com/simple-todos/01-creating-app.html",
    });

    await insertLink({
      title: "Follow the Guide",
      url: "https://guide.meteor.com",
    });

    await insertLink({
      title: "Read the Docs",
      url: "https://docs.meteor.com",
    });

    await insertLink({
      title: "Discussions",
      url: "https://forums.meteor.com",
    });
  }

  // We publish the entire Links collection to all clients.
  // In order to be fetched in real-time to the clients
  Meteor.publish("links", function () {
    return LinksCollection.find();
  });

  Meteor.publish("user", function () {
    return Meteor.users.find({
      _id: this.userId,
    });
  });
});
