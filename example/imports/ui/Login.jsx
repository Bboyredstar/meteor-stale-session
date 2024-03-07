import React, { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";

export const Login = () => {
  const [form, setForm] = useState({
    email: "user@poplar.com",
    password: "user",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };
  const handleSubmit = () => {
    Meteor.loginWithPassword(form.email, form.password, (error) => {
      if (error) {
        window.alert(error);
        return;
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
      <Alert variant="info">
        Please use "user@poplar.com" as email and "user" as password
      </Alert>
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
        Submit
      </Button>
    </Form>
  );
};
