import { useState } from "react";
import Camera from "./components/Camera";
import "./App.css";

const AUTH_KEY = "stresssense_logged_in";
const USER_KEY = "stresssense_user";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem(AUTH_KEY) === "true"
  );

  const [userEmail, setUserEmail] = useState(
    localStorage.getItem(USER_KEY) || ""
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const handleLogin = (event) => {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      setLoginError("Please enter both email and password.");
      return;
    }

    // Prototype-only authentication. Connect a real backend later.
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(USER_KEY, cleanEmail);
    setUserEmail(cleanEmail);
    setIsLoggedIn(true);
    setEmail("");
    setPassword("");
    setLoginError("");
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    setIsLoggedIn(false);
    setCameraReady(false);
  };

  if (!isLoggedIn) {
    return (
      <main className="auth-page">
        <div className="auth-glow auth-glow-one"></div>
        <div className="auth-glow auth-glow-two"></div>

        <section className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">🧠</div>
            <div>
              <h1>StressSense</h1>
              <p>Personal Stress Pattern Monitor</p>
            </div>
          </div>

          <div className="login-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to your dashboard</h2>
            <p>
              Start a private StressSense session and monitor your personal
              stress patterns.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            {loginError && <div className="login-error">⚠️ {loginError}</div>}

            <button className="login-button" type="submit">
              <span>→</span>
              Login to StressSense
            </button>
          </form>

          <div className="login-security">
            <span>🔒</span>
            <div>
              <strong>Prototype login</strong>
              <small>This demo stores login status locally in your browser.</small>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">🧠</div>
          <div>
            <h1>StressSense</h1>
            <p>Personal Stress Pattern Monitor</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="user-pill">
            <span className="user-avatar">{userEmail.charAt(0).toUpperCase()}</span>
            <span className="user-email">{userEmail}</span>
          </div>

          <div className={cameraReady ? "system-pill active" : "system-pill"}>
            <span className="system-dot"></span>
            {cameraReady ? "Monitoring Ready" : "Starting System"}
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="welcome-section">
        <div>
          <span className="eyebrow">AI WELLNESS DASHBOARD</span>
          <h2>
            Understand your<span> stress patterns.</span>
          </h2>
          <p>
            StressSense observes facial and movement patterns and compares them
            with your personal baseline to provide a real-time stress pattern estimate.
          </p>
        </div>

        <div className="privacy-badge">
          <span>🔒</span>
          <div>
            <strong>Session Privacy</strong>
            <small>Camera analysis runs during this session.</small>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <section className="dashboard-card camera-card">
          <div className="card-header">
            <div>
              <span className="card-label">LIVE MONITORING</span>
              <h3>Camera Analysis</h3>
            </div>
            <div className="live-badge"><span></span>LIVE</div>
          </div>

          <div className="camera-container">
            <Camera onVideoReady={() => setCameraReady(true)} />
          </div>
        </section>

        <section className="dashboard-card status-dashboard">
          <div className="card-header">
            <div>
              <span className="card-label">SYSTEM</span>
              <h3>System Status</h3>
            </div>
            <span className="status-icon">⚡</span>
          </div>

          <div className="status-list">
            <div className="status-row">
              <div className="status-info">
                <span className="status-symbol camera-symbol">📷</span>
                <div><strong>Camera</strong><small>Video input</small></div>
              </div>
              <span className={cameraReady ? "status-value success" : "status-value waiting"}>
                {cameraReady ? "Ready" : "Starting"}
              </span>
            </div>

            <div className="status-row">
              <div className="status-info">
                <span className="status-symbol">👁️</span>
                <div><strong>Face Detection</strong><small>Landmark tracking</small></div>
              </div>
              <span className="status-value success">Monitoring</span>
            </div>

            <div className="status-row">
              <div className="status-info">
                <span className="status-symbol">📊</span>
                <div><strong>Analysis</strong><small>Stress patterns</small></div>
              </div>
              <span className="status-value success">Real-time</span>
            </div>
          </div>

          <div className="system-message">
            <span>✦</span>
            <p>StressSense is continuously comparing your current patterns with your personal baseline.</p>
          </div>
        </section>
      </section>

      <section className="info-strip">
        <div className="info-item">
          <div className="info-icon blue">◉</div>
          <div><strong>Personal Baseline</strong><span>Your normal pattern</span></div>
        </div>
        <div className="info-divider"></div>
        <div className="info-item">
          <div className="info-icon purple">✦</div>
          <div><strong>AI Analysis</strong><span>Pattern comparison</span></div>
        </div>
        <div className="info-divider"></div>
        <div className="info-item">
          <div className="info-icon cyan">↗</div>
          <div><strong>Live Insights</strong><span>Real-time feedback</span></div>
        </div>
      </section>

      <footer className="app-footer">
        <div className="footer-brand"><span>🧠</span><strong>StressSense</strong></div>
        <p>Personal stress pattern monitoring prototype</p>
        <span className="footer-note">Built for learning & wellness awareness</span>
      </footer>
    </main>
  );
}
