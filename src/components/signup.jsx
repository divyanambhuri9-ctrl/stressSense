import { useState } from "react";
import { signupUser } from "../utils/authApi";

export default function Signup({
  onSignupSuccess,
  onShowLogin
}) {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [signupError, setSignupError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const handleSubmit = async (event) => {
    event.preventDefault();

    setSignupError("");

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();


    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setSignupError(
        "Please fill in all fields."
      );

      return;
    }


    if (password.length < 8) {
      setSignupError(
        "Password must contain at least 8 characters."
      );

      return;
    }


    if (
      password !== confirmPassword
    ) {
      setSignupError(
        "Passwords do not match."
      );

      return;
    }


    try {
      setLoading(true);

      const data =
        await signupUser(
          cleanName,
          cleanEmail,
          password
        );

      onSignupSuccess(data.user);
    } catch (error) {
      setSignupError(
        error.message ||
          "Unable to create account."
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
            GET STARTED
          </span>

          <h2>
            Create your account
          </h2>

          <p>
            Create a secure account to
            use StressSense.
          </p>
        </div>


        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <label>
            Full Name

            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              autoComplete="name"
              disabled={loading}
            />
          </label>


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
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="new-password"
              disabled={loading}
            />
          </label>


          <label>
            Confirm Password

            <input
              type="password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              disabled={loading}
            />
          </label>


          {signupError && (
            <div className="login-error">
              ⚠️ {signupError}
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
              ? "Creating..."
              : "Create StressSense Account"}
          </button>

        </form>


        <div className="login-security">
          <span>🔒</span>

          <div>
            <strong>
              Secure account
            </strong>

            <small>
              Your password is never stored
              as plain text.
            </small>
          </div>
        </div>


        <div className="auth-switch">
          <span>
            Already have an account?
          </span>

          <button
            type="button"
            onClick={onShowLogin}
          >
            Sign in
          </button>
        </div>

      </section>
    </main>
  );
}