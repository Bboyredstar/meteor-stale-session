import React from "react";
import { createRoot } from "react-dom/client";
import { Meteor } from "meteor/meteor";
import { App } from "/imports/ui/App";
import { StaleSessionClient } from "meteor/bboyredstar:stale-session";

Meteor.startup(async () => {
  new StaleSessionClient().run();
  
  const container = document.getElementById("react-target");
  const root = createRoot(container);

  root.render(<App />);
});
