import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Badge,
  Alert,
  ProgressBar,
  Button,
  Card,
} from 'react-bootstrap';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { staleSession, HEARTBEAT_METHOD_NAME } from '../../client/main';

// Fallback matching settings.json defaults
const DEFAULT_INACTIVE_TIMEOUT_MS = 300000; // 5 min

export const Home = () => {
  const [activityDetected, setActivityDetected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send a heartbeat immediately and return the updated lastHeartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await Meteor.callAsync(HEARTBEAT_METHOD_NAME, {});
      staleSession.markActivityDetected();
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }, []);

  // Send an initial heartbeat as soon as the component mounts so the timer
  // starts immediately rather than showing 0s until the first 30s interval tick.
  useEffect(() => {
    sendHeartbeat();
  }, [sendHeartbeat]);

  const {
    heartbeatCount,
    isConnected,
    user,
    settings,
    lastHeartbeat,
  } = useTracker(() => {
    const subscription = Meteor.subscribe('staleSessionHeartbeats');
    const currentUser = Meteor.user();
    const appSettings = Meteor.settings?.public?.packages?.['stale-session'];

    let count = 0;
    let lastBeat = null;

    if (subscription.ready() && currentUser) {
      const heartbeats = staleSession.heartbeatCollection
        .find({ userId: currentUser._id }, { sort: { createdAt: -1 } })
        .fetch();

      count = heartbeats.length;

      if (heartbeats.length > 0) {
        lastBeat = heartbeats[0].createdAt;
      }
    }

    return {
      heartbeatCount: count,
      isConnected: Meteor.status().connected,
      user: currentUser,
      settings: appSettings,
      lastHeartbeat: lastBeat,
    };
  }); // No deps — purely reactive, reruns only when Meteor data changes

  // Compute countdown outside useTracker so it updates every second from the
  // setInterval above without tearing down the subscription.
  const timeoutMs = settings?.inactiveTimeoutMs || DEFAULT_INACTIVE_TIMEOUT_MS;
  const timeUntilLogout = lastHeartbeat
    ? Math.max(
        0,
        Math.ceil(
          (timeoutMs - (currentTime.getTime() - lastHeartbeat.getTime())) / 1000
        )
      )
    : 0;


  // Activity monitoring for UI feedback only
  useEffect(() => {
    const handleActivity = () => {
      setActivityDetected(true);
      setTimeout(() => setActivityDetected(false), 2000);
    };

    const events = settings?.activityEvents?.split(' ') || [
      'click',
      'keydown',
      'mousemove',
    ];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [settings]);


  const progressPercentage =
    settings && lastHeartbeat
      ? (timeUntilLogout / (timeoutMs / 1000)) * 100
      : 0;

  const getProgressVariant = () => {
    if (progressPercentage > 60) return 'success';
    if (progressPercentage > 30) return 'warning';
    return 'danger';
  };

  return (
    <>
      <Row>
        <Col
          className='p-3'
          lg={{ span: 10, offset: 1 }}
        >
          <h1 className='text-center'>🧪 Stale Session Testing Dashboard</h1>
          <p className='text-center text-muted'>
            Testing automatic logout when user becomes inactive
          </p>
        </Col>
      </Row>

      {/* Status Cards */}
      <Row className='mb-4'>
        <Col lg={3}>
          <Card
            className={`text-center ${
              isConnected ? 'border-success' : 'border-danger'
            }`}
          >
            <Card.Body>
              <h5>🌐 Connection</h5>
              <Badge bg={isConnected ? 'success' : 'danger'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card className='text-center border-primary'>
            <Card.Body>
              <h5>💓 Heartbeats</h5>
              <Badge
                bg='primary'
                style={{ fontSize: '1.2em' }}
              >
                {heartbeatCount}
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card
            className={`text-center ${
              activityDetected ? 'border-warning' : 'border-secondary'
            }`}
          >
            <Card.Body>
              <h5>👆 Activity</h5>
              <Badge bg={activityDetected ? 'warning' : 'secondary'}>
                {activityDetected ? 'Detected!' : 'No Activity'}
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card className={`text-center border-${lastHeartbeat ? getProgressVariant() : 'secondary'}`}>
            <Card.Body>
              <h5>⏰ Until Logout</h5>
              {lastHeartbeat ? (
                <Badge
                  bg={getProgressVariant()}
                  style={{ fontSize: '1.2em' }}
                >
                  {timeUntilLogout}s
                </Badge>
              ) : (
                <Badge bg='secondary'>Waiting…</Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Progress Bar */}
      <Row className='mb-4'>
        <Col lg={{ span: 10, offset: 1 }}>
          <Card>
            <Card.Header>
              <h5>📊 Timer Until Automatic Logout</h5>
            </Card.Header>
            <Card.Body>
              <ProgressBar
                now={progressPercentage}
                variant={getProgressVariant()}
                label={`${timeUntilLogout} seconds`}
                style={{ height: '30px', fontSize: '16px' }}
              />
              <div className='mt-2 text-center text-muted'>
                {lastHeartbeat ? (
                  <>
                    Last Heartbeat: {lastHeartbeat.toLocaleTimeString()}
                    <br />
                    <small>
                      Server will disconnect after:{' '}
                      {new Date(
                        lastHeartbeat.getTime() + timeoutMs
                      ).toLocaleTimeString()}
                    </small>
                  </>
                ) : (
                  'No heartbeat recorded yet - perform some activity to start session tracking'
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Testing Instructions */}
      <Row className='mb-4'>
        <Col lg={{ span: 10, offset: 1 }}>
          <Alert variant='info'>
            <Alert.Heading>🧪 How to test automatic logout:</Alert.Heading>
            <ol>
              <li>
                <strong>Stop all activity</strong> - don't click or press any
                keys
              </li>
              <li>
                <strong>Watch the timer</strong> - it will countdown to logout
              </li>
              <li>
                <strong>Wait for logout</strong> - after{' '}
                {timeoutMs / 1000} seconds you'll be automatically logged out
              </li>
              <li>
                <strong>Test activity</strong> - any mouse movement/click will
                reset the timer
              </li>
            </ol>
            <hr />
            <div className='mb-0'>
              <strong>Current Settings:</strong>
              <ul className='mb-0 mt-2'>
                <li>
                  Inactive Timeout:{' '}
                  <Badge bg='secondary'>
                    {timeoutMs / 1000}s
                  </Badge>
                </li>
                <li>
                  Check Interval:{' '}
                  <Badge bg='secondary'>
                    {(settings?.heartbeatIntervalMs || 30000) / 1000}s
                  </Badge>
                </li>
                <li>
                  Monitored Events:{' '}
                  <Badge bg='secondary'>
                    {settings?.activityEvents || 'click keydown'}
                  </Badge>
                </li>
              </ul>
            </div>
          </Alert>
        </Col>
      </Row>

      {/* Test Controls */}
      <Row className='mb-4'>
        <Col lg={{ span: 10, offset: 1 }}>
          <Card>
            <Card.Header>
              <h5>🎮 Test Controls</h5>
            </Card.Header>
            <Card.Body>
              <div className='d-grid gap-2 d-md-flex justify-content-md-center'>
                <Button
                  variant='success'
                  onClick={sendHeartbeat}
                >
                  ✅ Send Heartbeat Now
                </Button>
                <Button
                  variant='info'
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  🔄 Refresh Data
                </Button>
                <Button
                  variant='danger'
                  onClick={() => Meteor.logout()}
                >
                  🚪 Manual Logout
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Debug Information */}
      <Row>
        <Col lg={{ span: 10, offset: 1 }}>
          <Card>
            <Card.Header>
              <h5>🔍 Debug Information</h5>
            </Card.Header>
            <Card.Body>
              <pre
                className='bg-light p-3 rounded'
                style={{ fontSize: '12px' }}
              >
                {JSON.stringify(
                  {
                    user: user
                      ? { _id: user._id, username: user.username }
                      : null,
                    heartbeatCount,
                    isConnected,
                    lastHeartbeat: lastHeartbeat?.toISOString() || null,
                    timeUntilLogout,
                    disconnectTime: lastHeartbeat
                      ? new Date(
                          lastHeartbeat.getTime() + timeoutMs
                        ).toISOString()
                      : null,
                    settings,
                  },
                  null,
                  2
                )}
              </pre>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};
