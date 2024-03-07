import React from "react";
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

const IfRender = ({ isTrue, children }) => {
  return <>{isTrue ? children : null}</>;
};

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
      <Switch>
        <Container>
          <Row>
            <Col lg={{ span: 6, offset: 3 }}>
              <IfRender isTrue={!!user}>
                <Route path="/">
                  <Home />
                </Route>
              </IfRender>

              <IfRender isTrue={!user}>
                <Route path="/login">
                  <Login />
                </Route>
              </IfRender>

              <Redirect to={user ? "/" : "login"} />
            </Col>
          </Row>
        </Container>
      </Switch>
    </Router>
  );
};
