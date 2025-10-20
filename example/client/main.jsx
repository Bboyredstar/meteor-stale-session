import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import { App } from '/imports/ui/App';

import { StaleSession } from 'meteor/bboyredstar:stale-session';

export const staleSession = new StaleSession(undefined, console);

Meteor.startup(async () => {
  // Create StaleSession using settings from settings.json
  // Configuration will be picked up from Meteor.settings.public.packages['stale-session']

  await staleSession.run();

  const container = document.getElementById('react-target');
  const root = createRoot(container);

  root.render(<App />);
});
