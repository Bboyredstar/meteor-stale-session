import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import { App } from '/imports/ui/App';

import {
  StaleSession,
  HEARTBEAT_METHOD_NAME,
} from 'meteor/bboyredstar:stale-session';

export { HEARTBEAT_METHOD_NAME };

export const staleSession = new StaleSession(undefined, console);

Meteor.startup(() => {
  // Start the stale session (sets up heartbeat interval + activity listeners).
  // Not awaited — client-side run() is synchronous in effect and should not
  // block the initial React render.
  staleSession.run().catch((err) => {
    console.error('StaleSession failed to start:', err);
  });

  const container = document.getElementById('react-target');
  const root = createRoot(container);

  root.render(<App />);
});
