# Stale Session Package Refactoring

## Overview

The stale session package has been refactored to provide a unified class structure with proper TypeScript types. Both client and server implementations now extend a common base class, ensuring consistency and better maintainability.

## Key Changes

### 1. Base Class (`StaleSessionBase`)
- **Location**: `base/stale-session-base.ts`
- **Purpose**: Contains shared functionality and configuration management
- **Features**:
  - Centralized configuration validation
  - Unified logging interface
  - Common getters for configuration properties
  - Abstract `run()` method that must be implemented by subclasses

### 2. Enhanced Type Definitions
- **Location**: `types.d.ts`
- **New Interfaces**:
  - `StaleSessionConfig`: Complete configuration interface
  - `StaleSessionClientConfig`: Client-specific configuration subset
  - `StaleSessionServerConfig`: Server-specific configuration subset
  - `HeartbeatResponse`: Standardized heartbeat method response
  - `Logger`: Enhanced logger interface with optional methods

### 3. Unified Constructor Pattern
Both client and server classes now accept:
```typescript
constructor(config?: Partial<ConfigType>, logger?: Logger)
```

### 4. Improved Client Class (`StaleSessionClient`)
- **Extends**: `StaleSessionBase`
- **New Features**:
  - Public `run()` method (was private)
  - `isActivityDetected()`: Check current activity status
  - `markActivityDetected()`: Manually trigger activity detection
  - Enhanced logging with activity detection messages
  - Configurable activity events

### 5. Enhanced Server Class (`StaleSessionServer`)
- **Extends**: `StaleSessionBase`
- **Improvements**:
  - Better error handling in heartbeat processing
  - Enhanced logging throughout the lifecycle
  - Proper return types for all methods
  - Improved validation and initialization

## Usage Examples

### Client Usage
```typescript
import { StaleSessionClient } from './client/stale-session-client';

const logger = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

const client = new StaleSessionClient({
  heartbeatIntervalMs: 180000, // 3 minutes
  activityEvents: 'mousemove click keydown'
}, logger);

client.run();

// Check activity status
if (client.isActivityDetected()) {
  console.log('User is active');
}
```

### Server Usage
```typescript
import { StaleSessionServer } from './server/stale-session-server';

const logger = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

const server = new StaleSessionServer({
  heartbeatIntervalMs: 180000,
  inactiveTimeoutMs: 1800000, // 30 minutes
  forceLogout: true,
  heartbeatCollectionName: 'user_heartbeats'
}, logger);

await server.run();

// Access the heartbeat collection
const collection = server.getCollection();
```

## Configuration Options

### Shared Configuration
- `heartbeatIntervalMs`: Interval for heartbeat checks (minimum 60000ms)
- `inactiveTimeoutMs`: Timeout before considering a session stale (minimum 60000ms)
- `forceLogout`: Whether to automatically log out stale sessions
- `heartbeatCollectionName`: Name of the MongoDB collection for heartbeats

### Client-Specific Configuration
- `activityEvents`: jQuery events that indicate user activity

## Benefits of the Refactoring

1. **Type Safety**: Full TypeScript support with proper interfaces
2. **Code Reuse**: Common functionality shared through base class
3. **Consistency**: Unified logging and configuration patterns
4. **Flexibility**: Configurable options with sensible defaults
5. **Maintainability**: Clear separation of concerns and responsibilities
6. **Error Handling**: Improved error handling and logging throughout
7. **Extensibility**: Easy to extend with new features in the future

## Backward Compatibility

The refactored classes maintain backward compatibility with the existing API while adding new features and improved type safety. Existing code should continue to work with minimal changes.