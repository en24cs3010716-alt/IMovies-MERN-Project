
import React, { useState } from "react";

export default function Register({ onRegister, onShowLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      onRegister();
    } catch (err) {
      setMessage(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-decoration">
        <p className="eyebrow">YOUR CINEMA EXPERIENCE</p>
        <h1>Every great story starts with a ticket.</h1>
        <p>
          Create your iMovies account to discover movies,
          book tickets and keep track of your bookings.
        </p>

        <div className="auth-visual">
          <span>▶</span>
          <div>
            <strong>iMOVIES</strong>
            <small>YOUR SEAT IS WAITING</small>
          </div>
        </div>
      </div>

      <form className="booking-form auth-form" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <span className="brand-icon">▶</span> iMovies
        </div>

        <p className="auth-eyebrow">JOIN THE EXPERIENCE</p>
        <h2>Create your account</h2>
        <p className="form-sub">
          Sign up and get ready for your next movie night.
        </p>

        <label>
          Full name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            maxLength={80}
            autoComplete="name"
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>

        <button className="submit" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account →"}
        </button>

        {message && (
          <p className="auth-message" role="alert">
            {message}
          </p>
        )}

        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" onClick={onShowLogin}>
            Login
          </button>
        </p>

        <p className="auth-footnote">
          Your next movie night starts here.
        </p>
      </form>
    </section>
  );
}
