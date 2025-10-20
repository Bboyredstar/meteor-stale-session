# Unified Stale Session Package

## Overview

The stale session package has been successfully refactored to use a unified approach with the `imports/` folder structure. This follows Meteor best practices and provides a single class that works on both client and server.

## New Structure

```
/imports/
  /lib/
    stale-session.ts        # Unified StaleSession class
    types.ts               # TypeScript interfaces and types
    /utils/
      constants.ts         # Package constants
      schemas.ts          # Validation schemas
      settings.ts         # Configuration settings
index.ts                   # Main exports
```

## Key Benefits

### ✅ **Unified Architecture**
- Single `StaleSession` class works on both client and server
- Automatically detects environment using `Meteor.isClient`/`Meteor.isServer`
- Shared configuration and logging interface

### ✅ **Meteor Best Practices**
- Code placed in `imports/` folder for proper tree-shaking
- Only loaded when explicitly imported
- Smaller bundle sizes for both client and server

### ✅ **Environment-Aware Functionality**
- **Client**: Activity detection, heartbeat sending
- **Server**: Session management, heartbeat collection, user logout
- Methods throw appropriate errors when called in wrong environment

### ✅ **Backward Compatibility**
- Legacy `StaleSessionClient` and `StaleSessionServer` exports available
- Existing code should work with minimal changes
- Same configuration options and method signatures

## Usage

### Simple Usage (Recommended)
```typescript
import { StaleSession } from 'meteor/bboyredstar:stale-session';

const staleSession = new StaleSession({
  heartbeatIntervalMs: 180000, // 3 minutes
  inactiveTimeoutMs: 1800000,  // 30 minutes
  forceLogout: true
});

await staleSession.run(); // Works on both client and server
```

### Legacy Usage (Still Supported)
```typescript
import { StaleSessionClient, StaleSessionServer } from 'meteor/bboyredstar:stale-session';

// Both are aliases to the same unified class
const client = new StaleSessionClient();
const server = new StaleSessionServer();
```

## Configuration Options

All configuration is now optional with sensible defaults:

```typescript
interface StaleSessionConfig {
  heartbeatIntervalMs: number;      // Default: 180000 (3 min)
  inactiveTimeoutMs: number;        // Default: 1800000 (30 min)
  forceLogout: boolean;             // Default: false
  heartbeatCollectionName: string;  // Default: "heartbeat"
  activityEvents?: string;          // Default: "mousemove click keydown"
}
```

## Environment-Specific Methods

### Client Methods
- `isActivityDetected()`: Check if user activity was detected
- `markActivityDetected()`: Manually mark activity

### Server Methods  
- `getCollection()`: Access the heartbeat MongoDB collection

### Shared Methods
- `run()`: Start the stale session monitoring
- `getHeartbeatInterval()`: Get heartbeat interval setting
- `getInactiveTimeout()`: Get inactive timeout setting
- `isForceLogoutEnabled()`: Check if force logout is enabled
- `getHeartbeatCollectionName()`: Get collection name
- `getActivityEvents()`: Get activity events string

## Error Handling

The unified class includes comprehensive error handling:
- Configuration validation using schemas
- Graceful fallbacks for missing dependencies
- Clear error messages when methods are called in wrong environment
- Enhanced logging throughout the lifecycle

## Migration Guide

### From Separate Classes
If you were using separate client and server classes:

**Before:**
```typescript
// Client code
import { StaleSessionClient } from './client/stale-session-client';
const client = new StaleSessionClient(logger);
client.run();

// Server code  
import { StaleSessionServer } from './server/stale-session-server';
const server = new StaleSessionServer(logger);
await server.run();
```

**After:**
```typescript
// Works everywhere
import { StaleSession } from 'meteor/bboyredstar:stale-session';
const staleSession = new StaleSession(config, logger);
await staleSession.run();
```

### Configuration Changes
Configuration is now unified and more flexible:

**Before:**
```typescript
// Fixed settings from Meteor.settings
const client = new StaleSessionClient(logger);
```

**After:**
```typescript
// Configurable with defaults
const staleSession = new StaleSession({
  heartbeatIntervalMs: 120000,  // Override default
  forceLogout: true
}, logger);
```

## Benefits Summary

1. **Simplified API**: One class instead of two
2. **Better Performance**: Tree-shaking and on-demand loading
3. **Type Safety**: Comprehensive TypeScript support
4. **Flexibility**: Configurable options with sensible defaults
5. **Maintainability**: Single codebase for both environments
6. **Error Handling**: Improved error handling and logging
7. **Future-Proof**: Easier to extend and modify

The refactored package maintains full backward compatibility while providing a modern, unified approach to stale session management in Meteor applications.