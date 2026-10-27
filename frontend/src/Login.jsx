
import React, { useState } from "react";

export default function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token) {
        throw new Error("Login token was not returned by the server.");
      }

      onLogin(data);
    } catch (err) {
      setMessage(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-decoration">
        <span className="auth-eyebrow">WELCOME TO THE BIG SCREEN</span>
        <h1>Your next<br />movie night<br /><span>starts here.</span></h1>
        <p>Discover movies. Book your seats. Make it a movie night.</p>
        <div className="auth-film-icon">▶</div>
      </div>

      <form className="booking-form auth-form" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <span className="brand-icon">▶</span>
          <span>iMovies</span>
        </div>

        <p className="auth-eyebrow">YOUR CINEMA EXPERIENCE</p>
        <h2>Welcome back</h2>
        <p className="form-sub">Login to continue to your account.</p>

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="submit" type="submit" disabled={loading}>
          <span>{loading ? "Logging in..." : "Login to your account"}</span>
          <span>→</span>
        </button>

        {message && (
          <p className="message error" role="alert">{message}</p>
        )}

        <p className="auth-switch">
          Don't have an account?{" "}
          <button type="button" onClick={onShowRegister}>
            Register now
          </button>
        </p>

        <p className="auth-footnote">YOUR SEAT. YOUR MOVIE. YOUR MOMENT.</p>
      </form>
    </section>
  );
}
