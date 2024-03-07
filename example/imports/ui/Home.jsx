import React, { useEffect, useState } from "react";
import { Row, Col, ProgressBar } from "react-bootstrap";

const { inactiveTimeoutMs } =
  Meteor?.settings?.public?.packages?.["stale-session"] ?? {};

export const Home = () => {
  const [timeLeft, setTimeLeft] = useState(inactiveTimeoutMs / 1000);
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    if (timeLeft > 0 && intervalId === null) {
      Meteor.call("heartbeat", {}, (err, res) => {
        if (err) {
          window.alert(err);
          return;
        }

        const shiftStep =
          new Date().getTime() - new Date(res.createdAt).getTime();

        if (shiftStep < inactiveTimeoutMs) {
          setTimeLeft(timeLeft - shiftStep);
        }

        const intervalId = setInterval(() => {
          setTimeLeft((prevValue) => (prevValue = prevValue - 2));
        }, [2000]);
        setIntervalId(intervalId);
      });
    }

    if (timeLeft <= 0) {
      clearInterval(intervalId);
    }
  }, [timeLeft]);

  return (
    <>
      <Row>
        <Col className="p-3" lg={{ span: 6, offset: 3 }}>
          <h1 className="text-center">Private page </h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <i>
            Sensitive information =)
            <br />
            Need to be authorized
          </i>
        </Col>
      </Row>

      <Row className="my-3">
        <Col>
          <p>
            You forgot to log out of your account and left it on? No problem
            with this package you will be disconnected from the session in about
            a minute:
          </p>

          <ProgressBar variant="danger" max={60} now={timeLeft} />
        </Col>
      </Row>

      <Row>
        <Col className="py-3 mt-3">
          <span>
            Periodically send a heartbeat if activity events have been detected within
            the interval
          </span>
          <code>
            <pre>
              {JSON.stringify(
                Meteor?.settings?.public?.packages?.["stale-session"],
                null,
                2
              )}
            </pre>
          </code>
        </Col>
      </Row>
    </>
  );
};
