# Stale Session Example

This example demonstrates how to use the unified `bboyredstar:stale-session` package in a Meteor application.

## Features Demonstrated

- **Unified API**: Single `StaleSession` class works on both client and server
- **Configuration Options**: Shows both programmatic and settings.json configuration
- **Activity Monitoring**: Real-time display of user activity detection
- **Session Management**: Automatic heartbeat sending and session cleanup
- **TypeScript Support**: Full type safety with official @types packages

## Quick Start

1. **Install dependencies:**
   ```bash
   cd example
   meteor npm install
   ```

2. **Run the application:**
   ```bash
   meteor --settings settings.json
   ```

3. **Login with test credentials:**
   - Username: `user`
   - Password: `user`

## Configuration

### Using settings.json (Recommended)

Configure the package via `settings.json`:

```json
{
  "public": {
    "packages": {
      "stale-session": {
        "inactiveTimeoutMs": 900000,
        "heartbeatIntervalMs": 120000,
        "forceLogout": true,
        "heartbeatCollectionName": "user_sessions",
        "activityEvents": "mousemove click keydown scroll touchstart"
      }
    }
  }
}
```

### Programmatic Configuration

You can also configure the package programmatically:

```javascript
const staleSession = new StaleSession({
  heartbeatIntervalMs: 180000, // 3 minutes
  inactiveTimeoutMs: 1800000,  // 30 minutes
  forceLogout: true,
  heartbeatCollectionName: 'heartbeat',
  activityEvents: 'mousemove click keydown'
}, console);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inactiveTimeoutMs` | number | 1,800,000 (30 min) | Max time user can be inactive before logout |
| `heartbeatIntervalMs` | number | 180,000 (3 min) | Frequency of heartbeat checks |
| `forceLogout` | boolean | false | Whether to automatically logout stale sessions |
| `heartbeatCollectionName` | string | 'heartbeat' | MongoDB collection for session tracking |
| `activityEvents` | string | 'mousemove click keydown' | DOM events that indicate activity |

## Usage Examples

### Server-side Setup

```javascript
import { StaleSession } from 'meteor/bboyredstar:stale-session';

Meteor.startup(async () => {
  // Option 1: Use settings from settings.json
  const staleSession = new StaleSession(undefined, console);
  
  // Option 2: Use explicit configuration
  const staleSession = new StaleSession({
    heartbeatIntervalMs: 180000,
    inactiveTimeoutMs: 1800000,
    forceLogout: true
  }, console);
  
  await staleSession.run();
});
```

### Client-side Setup

```javascript
import { StaleSession } from 'meteor/bboyredstar:stale-session';

Meteor.startup(async () => {
  const staleSession = new StaleSession(undefined, console);
  await staleSession.run();
});
```

## How It Works

1. **Activity Detection**: The client monitors DOM events (mousemove, click, keydown, etc.)
2. **Heartbeat Sending**: When activity is detected, a heartbeat is sent to the server
3. **Session Tracking**: The server tracks active sessions in MongoDB
4. **Cleanup**: Stale sessions are automatically removed based on the timeout settings
5. **Force Logout**: Optionally force logout users with expired sessions

## TypeScript Support

The package includes full TypeScript support with proper type definitions. All configuration options are type-safe, and the API provides IntelliSense support.

## Troubleshooting

### Build Issues
If you encounter TypeScript build issues, ensure your package has the proper symlink setup:
```bash
cd packages/stale-session
ln -sf ./.npm/*/node_modules ./node_modules
```

### Session Not Expiring
- Check that `forceLogout` is set to `true` in your configuration
- Verify the `inactiveTimeoutMs` value is appropriate for your use case
- Ensure the user has activity events being triggered

### Heartbeats Not Sending
- Verify `activityEvents` includes events that occur in your application
- Check browser console for any JavaScript errors
- Ensure the user is logged in (heartbeats only send for authenticated users)