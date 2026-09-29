import {
  useEffect,
  useState
} from "react";

import Camera from "./components/Camera";
import ExamMode from "./components/ExamMode";

import Login from "./components/login";
import Signup from "./components/signup";

import {
  getCurrentUser,
  logoutUser
} from "./utils/authApi";

import "./App.css";


export default function App() {

  // ===============================
  // AUTH STATE
  // ===============================

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [authPage, setAuthPage] =
    useState("login");


  // ===============================
  // APPLICATION STATE
  // ===============================

  const [cameraReady, setCameraReady] =
    useState(false);

  const [currentMode, setCurrentMode] =
    useState("stress");


  // ===============================
  // CHECK LOGIN SESSION
  // ===============================

  useEffect(() => {
    const restoreSession =
      async () => {
        try {
          const data =
            await getCurrentUser();

          setUser(data.user);
        } catch {
          setUser(null);
        } finally {
          setAuthLoading(false);
        }
      };

    restoreSession();
  }, []);


  // ===============================
  // LOGIN SUCCESS
  // ===============================

  const handleLoginSuccess =
    (loggedInUser) => {
      setUser(loggedInUser);

      setCurrentMode("stress");
      setCameraReady(false);
    };


  // ===============================
  // SIGNUP SUCCESS
  // ===============================

  const handleSignupSuccess =
    (newUser) => {
      setUser(newUser);

      setCurrentMode("stress");
      setCameraReady(false);
    };


  // ===============================
  // LOGOUT
  // ===============================

  const handleLogout =
    async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      } finally {
        setUser(null);
        setCameraReady(false);
        setCurrentMode("stress");
      }
    };


  // ===============================
  // AUTH LOADING
  // ===============================

  if (authLoading) {
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
              SECURE SESSION
            </span>

            <h2>
              Checking your session...
            </h2>

            <p>
              Please wait while StressSense
              verifies your account.
            </p>
          </div>

          <div className="login-security">
            <span>🔐</span>

            <div>
              <strong>
                Authentication
              </strong>

              <small>
                Connecting securely to
                StressSense.
              </small>
            </div>
          </div>

        </section>
      </main>
    );
  }


  // ===============================
  // LOGIN / SIGNUP
  // ===============================

  if (!user) {

    if (authPage === "signup") {
      return (
        <Signup
          onSignupSuccess={
            handleSignupSuccess
          }
          onShowLogin={() =>
            setAuthPage("login")
          }
        />
      );
    }

    return (
      <Login
        onLoginSuccess={
          handleLoginSuccess
        }
        onShowSignup={() =>
          setAuthPage("signup")
        }
      />
    );
  }


  // ===============================
  // MAIN APPLICATION
  // ===============================

  return (
    <main className="app">

      {/* =========================
          TOP BAR
      ========================= */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            🧠
          </div>

          <div>

            <h1>
              StressSense
            </h1>

            <p>
              {currentMode === "exam"
                ? "AI Exam Behavior & Integrity Analytics"
                : "Personal Stress Pattern Monitor"}
            </p>

          </div>

        </div>


        <div className="topbar-actions">

          <div className="user-pill">

            <span className="user-avatar">
              {user.name
                ?.charAt(0)
                .toUpperCase()}
            </span>

            <span className="user-email">
              {user.email}
            </span>

          </div>


          <div
            className={
              cameraReady
                ? "system-pill active"
                : "system-pill"
            }
          >

            <span className="system-dot"></span>

            {cameraReady
              ? "Monitoring Ready"
              : "Starting System"}

          </div>


          <button
            className="logout-button"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>

        </div>

      </header>


      {/* =========================
          MODE SWITCHER
      ========================= */}

      <section className="mode-switcher">

        <button
          className={
            currentMode === "stress"
              ? "mode-button active"
              : "mode-button"
          }
          type="button"
          onClick={() =>
            setCurrentMode("stress")
          }
        >
          🧠 Stress Monitor
        </button>


        <button
          className={
            currentMode === "exam"
              ? "mode-button active"
              : "mode-button"
          }
          type="button"
          onClick={() =>
            setCurrentMode("exam")
          }
        >
          📝 Exam Mode
        </button>

      </section>


      {/* =========================
          EXAM MODE
      ========================= */}

      {currentMode === "exam" && (
        <ExamMode />
      )}


      {/* =========================
          STRESS MONITOR
      ========================= */}

      {currentMode === "stress" && (
        <>

          <section className="welcome-section">

            <div>

              <span className="eyebrow">
                AI WELLNESS DASHBOARD
              </span>

              <h2>
                Understand your
                <span>
                  {" "}stress patterns.
                </span>
              </h2>

              <p>
                StressSense observes facial
                and movement patterns and
                compares them with your
                personal baseline to provide
                a real-time stress pattern
                estimate.
              </p>

            </div>


            <div className="privacy-badge">

              <span>🔒</span>

              <div>

                <strong>
                  Session Privacy
                </strong>

                <small>
                  Camera analysis runs
                  during this session.
                </small>

              </div>

            </div>

          </section>


          <section className="dashboard-grid">

            <section className="dashboard-card camera-card">

              <div className="card-header">

                <div>

                  <span className="card-label">
                    LIVE MONITORING
                  </span>

                  <h3>
                    Camera Analysis
                  </h3>

                </div>


                <div className="live-badge">

                  <span></span>

                  LIVE

                </div>

              </div>


              <div className="camera-container">

                <Camera
                  onVideoReady={() =>
                    setCameraReady(true)
                  }
                />

              </div>

            </section>


            <section className="dashboard-card status-dashboard">

              <div className="card-header">

                <div>

                  <span className="card-label">
                    SYSTEM
                  </span>

                  <h3>
                    System Status
                  </h3>

                </div>

                <span className="status-icon">
                  ⚡
                </span>

              </div>


              <div className="status-list">

                <div className="status-row">

                  <div className="status-info">

                    <span className="status-symbol camera-symbol">
                      📷
                    </span>

                    <div>

                      <strong>
                        Camera
                      </strong>

                      <small>
                        Video input
                      </small>

                    </div>

                  </div>


                  <span
                    className={
                      cameraReady
                        ? "status-value success"
                        : "status-value waiting"
                    }
                  >
                    {cameraReady
                      ? "Ready"
                      : "Starting"}
                  </span>

                </div>


                <div className="status-row">

                  <div className="status-info">

                    <span className="status-symbol">
                      👁️
                    </span>

                    <div>

                      <strong>
                        Face Detection
                      </strong>

                      <small>
                        Landmark tracking
                      </small>

                    </div>

                  </div>


                  <span className="status-value success">
                    Monitoring
                  </span>

                </div>


                <div className="status-row">

                  <div className="status-info">

                    <span className="status-symbol">
                      📊
                    </span>

                    <div>

                      <strong>
                        Analysis
                      </strong>

                      <small>
                        Stress patterns
                      </small>

                    </div>

                  </div>


                  <span className="status-value success">
                    Real-time
                  </span>

                </div>

              </div>


              <div className="system-message">

                <span>✦</span>

                <p>
                  StressSense is continuously
                  comparing your current
                  patterns with your personal
                  baseline.
                </p>

              </div>

            </section>

          </section>


          <section className="info-strip">

            <div className="info-item">

              <div className="info-icon blue">
                ◉
              </div>

              <div>

                <strong>
                  Personal Baseline
                </strong>

                <span>
                  Your normal pattern
                </span>

              </div>

            </div>


            <div className="info-divider"></div>


            <div className="info-item">

              <div className="info-icon purple">
                ✦
              </div>

              <div>

                <strong>
                  AI Analysis
                </strong>

                <span>
                  Pattern comparison
                </span>

              </div>

            </div>


            <div className="info-divider"></div>


            <div className="info-item">

              <div className="info-icon cyan">
                ↗
              </div>

              <div>

                <strong>
                  Live Insights
                </strong>

                <span>
                  Real-time feedback
                </span>

              </div>

            </div>

          </section>


          <footer className="app-footer">

            <div className="footer-brand">

              <span>🧠</span>

              <strong>
                StressSense
              </strong>

            </div>

            <p>
              Personal stress pattern
              monitoring prototype
            </p>

            <span className="footer-note">
              Built for learning & wellness
              awareness
            </span>

          </footer>

        </>
      )}

    </main>
  );
}