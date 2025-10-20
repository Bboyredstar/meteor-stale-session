import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Badge,
  Alert,
  ProgressBar,
  Button,
  Card,
} from 'react-bootstrap';
import { useTracker } from 'meteor/react-meteor-data';
import { staleSession } from '../../client/main';

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

  const {
    heartbeatCount,
    isConnected,
    user,
    settings,
    lastHeartbeat,
    timeUntilLogout,
  } = useTracker(() => {
    const subscription = Meteor.subscribe('staleSessionHeartbeats');
    const currentUser = Meteor.user();
    const appSettings = Meteor.settings?.public?.packages?.['stale-session'];

    let count = 0;
    let lastBeat = null;
    let timeLeft = 0;

    if (subscription.ready() && currentUser) {
      const heartbeats = staleSession.heartbeatCollection
        .find({ userId: currentUser._id }, { sort: { createdAt: -1 } })
        .fetch();

      count = heartbeats.length;

      if (heartbeats.length > 0) {
        lastBeat = heartbeats[0].createdAt;

        // Calculate exact time until logout based on server logic
        const now = currentTime.getTime();
        const lastBeatTime = lastBeat.getTime();
        const timeSinceLastBeat = now - lastBeatTime;
        const timeoutMs = appSettings?.inactiveTimeoutMs || 30000;
        const remaining = Math.max(0, timeoutMs - timeSinceLastBeat);
        timeLeft = Math.ceil(remaining / 1000);
      }
    }

    return {
      heartbeatCount: count,
      isConnected: Meteor.status().connected,
      user: currentUser,
      settings: appSettings,
      lastHeartbeat: lastBeat,
      timeUntilLogout: timeLeft,
    };
  }, [currentTime]); // Re-run when currentTime updates

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
      ? (timeUntilLogout / (settings.inactiveTimeoutMs / 1000)) * 100
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
          <Card className={`text-center border-${getProgressVariant()}`}>
            <Card.Body>
              <h5>⏰ Until Logout</h5>
              <Badge
                bg={getProgressVariant()}
                style={{ fontSize: '1.2em' }}
              >
                {timeUntilLogout}s
              </Badge>
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
                        lastHeartbeat.getTime() +
                          (settings?.inactiveTimeoutMs || 30000)
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
                {settings?.inactiveTimeoutMs / 1000 || 30} seconds you'll be
                automatically logged out
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
                    {settings?.inactiveTimeoutMs / 1000 || 30}s
                  </Badge>
                </li>
                <li>
                  Check Interval:{' '}
                  <Badge bg='secondary'>
                    {settings?.heartbeatIntervalMs / 1000 || 30}s
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
                  onClick={() => {
                    // Trigger activity to force a heartbeat
                    if (staleSession.markActivityDetected) {
                      staleSession.markActivityDetected();
                    }
                  }}
                >
                  ✅ Trigger Activity (Send Heartbeat)
                </Button>
                <Button
                  variant='info'
                  onClick={() => {
                    // Force refresh of subscription data
                    window.location.reload();
                  }}
                >
                  � Refresh Data
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
                          lastHeartbeat.getTime() +
                            (settings?.inactiveTimeoutMs || 30000)
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
