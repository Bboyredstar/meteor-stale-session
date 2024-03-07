# bboyredstar:stale-session for Meteor 3.0

Stale session and session timeout handling for [Meteorjs](http://www.meteor.com/).

## Quick Start

```sh
$ meteor add bboyredstar:stale-session
```

## Key Concepts

When a user logs in to a meteor application, they may gain access to privileged information and functionality.  If they neglect to log off, another user of the same computer can effectively impersonate that user and gains the same rights.  

This package is designed to detect a user's inactivity and automatically log them off after a configurable amount of time thereby reducing the size of this window to just the inactivity delay.

It is possible to configure both the timeout and the events that consitute activity.

The user will be logged off whether the browser window remains open or not.

The user is logged off by the server and disabling javascript in the browser (kind of pointless in meteor!) would not prevent automatic log off.

The user can be logged on multiple times on multiple devices and activity in any one of those devices will keep the sessions alive.

## Configuration

Configuration is via `Meteor.settings.public.packages.['stale-session']`.

- `inactiveTimeoutMs` - the amount of time (in ms) after which, if no activity is noticed, a session will be considered stale - default 30 minutes.
- `heartbeatIntervalMs` - interval (in ms) at which stale sessions are purged i.e. found and forcibly logged out - default 3 minute.
- `activityEvents` - the jquery events which are considered indicator of activity e.g. in an on() call - default `mousemove click keydown`
- `forceLogout` - whether or not we want to force log out and purge state sessions
- `heartbeatCollectionName` - custom name for the collection where we store all info about heartbeats - default `heartbeat`

You can set these variables in `config/settings.json` and then launch Meteor with `meteor --settings config/settings.json`.

Example `config/settings.json` file:

```json
{
  "public": {
    "packages": {
      "stale-session": {
        "inactiveTimeoutMs": 60000,
        "heartbeatIntervalMs": 60000,
        "forceLogout": true,
        "heartbeatCollectionName": "heartbeat",
        "activityEvents": "resize"
      }
    }
  }
}
```

## License

MIT