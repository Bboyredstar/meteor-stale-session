import React, { useState } from "react";
import { Meteor } from "meteor/meteor";
import { Form, Button, Alert } from "react-bootstrap";

export const Login = () => {
  const [form, setForm] = useState({
    email: "user@poplar.com",
    password: "user",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);
    Meteor.loginWithPassword(form.email, form.password, (err) => {
      if (err) {
        setError(err.reason || err.message || "Login failed");
      }
    });
  };

  return (
    <Form
      className="p-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <h4 className="mb-3 text-center">Sign In</h4>

      <Alert variant="info">
        Default credentials are pre-filled — just click <strong>Sign In</strong>.
      </Alert>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label>Email address</Form.Label>
        <Form.Control
          type="email"
          placeholder="Enter email"
          id="email"
          value={form.email}
          onChange={handleChange}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          placeholder="Password"
          value={form.password}
          id="password"
          onChange={handleChange}
        />
      </Form.Group>
      <Button variant="primary" type="submit">
        Sign In
      </Button>
    </Form>
  );
};
