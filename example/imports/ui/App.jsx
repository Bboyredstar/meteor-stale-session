import React from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import {
  Switch,
  Route,
  BrowserRouter as Router,
  Redirect,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { Home } from "./Home";
import { Login } from "./Login";

export const App = () => {
  const { user, loading } = useTracker(() => {
    const sub = Meteor.subscribe("user");

    if (!sub.ready()) {
      return { loading: true, user: null };
    }
    const user = Meteor.user();
    return { user, loading: false };
  }, []);

  if (loading) {
    return null;
  }

  return (
    <Router>
      <Container>
        <Row>
          <Col lg={{ span: 6, offset: 3 }}>
            <Switch>
              {user ? (
                <>
                  <Route path="/" exact component={Home} />
                  <Redirect to="/" />
                </>
              ) : (
                <>
                  <Route path="/login" component={Login} />
                  <Redirect to="/login" />
                </>
              )}
            </Switch>
          </Col>
        </Row>
      </Container>
    </Router>
  );
};
