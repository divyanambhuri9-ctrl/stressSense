import { useState } from "react";
import { loginUser } from "../utils/authApi";

export default function Login({
  onLoginSuccess,
  onShowSignup
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loginError, setLoginError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoginError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setLoginError(
        "Please enter both email and password."
      );

      return;
    }

    try {
      setLoading(true);

      const data =
        await loginUser(
          cleanEmail,
          password
        );

      onLoginSuccess(data.user);
    } catch (error) {
      setLoginError(
        error.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one"></div>
      <div className="auth-glow auth-glow-two"></div>

      <section className="login-card">

        <div className="login-brand">
          <div className="login-brand-icon">
            🧠
          </div>

          <div>
            <h1>StressSense</h1>

            <p>
              Personal Stress Pattern Monitor
            </p>
          </div>
        </div>


        <div className="login-heading">
          <span className="eyebrow">
            WELCOME BACK
          </span>

          <h2>
            Sign in to your dashboard
          </h2>

          <p>
            Continue your private
            StressSense session.
          </p>
        </div>


        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <label>
            Email

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              disabled={loading}
            />
          </label>


          <label>
            Password

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              disabled={loading}
            />
          </label>


          {loginError && (
            <div className="login-error">
              ⚠️ {loginError}
            </div>
          )}


          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            <span>
              {loading ? "⏳" : "→"}
            </span>

            {loading
              ? "Checking..."
              : "Login to StressSense"}
          </button>

        </form>


        <div className="login-security">
          <span>🔒</span>

          <div>
            <strong>
              Secure authentication
            </strong>

            <small>
              Your password is securely
              hashed before being stored.
            </small>
          </div>
        </div>


        <div className="auth-switch">
          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={onShowSignup}
          >
            Create account
          </button>
        </div>

      </section>
    </main>
  );
}