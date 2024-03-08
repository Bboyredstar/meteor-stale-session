Package.describe({
  name: "bboyredstar:stale-session",
  version: "0.0.2",
  // Brief, one-line summary of the package.
  summary: "Activity detection for the session timeout",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/Bboyredstar/meteor-stale-session",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "../../../README.md",
});

Npm.depends({
  "@types/meteor": "2.9.7",
  "lodash.throttle": "4.1.1",
  "simpl-schema": "3.4.1",
  jquery: "3.5.0",
});

Package.onUse(function (api) {
  api.versionsFrom("2.15");
  api.use(["ecmascript", "typescript", "tmeasday:check-npm-versions@1.0.2"]);

  api.mainModule("server/stale-session-server.ts", "server");
  api.mainModule("client/stale-session-client.ts", "client");

  api.export("StaleSessionServer", "server");
  api.export("StaleSessionClient", "client");
});
