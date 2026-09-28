import { useEffect, useRef, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { createFaceLandmarker } from "../utils/faceLandmarker";

import {
  calculateEyeAspectRatio,
  calculateHeadMovement
} from "../utils/faceMetrics";

import {
  createBaseline,
  differenceFromBaseline
} from "../utils/baseline";

import {
  calculateStressScore,
  getStressLevel
} from "../utils/stressScore";

import {
  addScore,
  getTrend
} from "../utils/trend";

import { getStressReasons } from "../utils/stressReasons";

import { getRecommendation } from "../utils/recommendation";

import { calculateSessionSummary } from "../utils/sessionSummary";


function DetailContent({ icon, value, description }) {
  return (
    <>
      <div className="modal-score">
        <div className="modal-score-number">{icon}</div>
        <div className="modal-score-label">Current Reading</div>
        <div className="modal-stress-level">{value}</div>
      </div>
      <div className="modal-description">
        <p>{description}</p>
      </div>
    </>
  );
}

export default function Camera({ onVideoReady }) {

  const videoRef = useRef(null);

  const previousHeadRef = useRef(null);

  const baselineSamplesRef = useRef([]);

  const baselineRef = useRef(null);

  const lastHistoryTimeRef = useRef(0);


  const [error, setError] = useState("");

  const [faceDetected, setFaceDetected] = useState(false);

  const [eyeRatio, setEyeRatio] = useState(0);

  const [headMovement, setHeadMovement] = useState(0);

  const [facialMovement, setFacialMovement] = useState(0);


  const [baseline, setBaseline] = useState(null);

  const [baselineDifference, setBaselineDifference] = useState({
    eye: 0,
    head: 0,
    facial: 0
  });


  const [stressScore, setStressScore] = useState(0);

  const [stressLevel, setStressLevel] = useState("Low");


  const [scoreHistory, setScoreHistory] = useState([]);

  const [stressTrend, setStressTrend] = useState("Stable");

  const [stressReasons, setStressReasons] = useState([]);

  const [recommendation, setRecommendation] = useState("");

  // Interactive dashboard details modal
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Session control
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionActiveRef = useRef(false);


  useEffect(() => {

    let animationFrameId;

    let faceLandmarker;

    let stream;


    const startCamera = async () => {

      // Camera permission/access is handled separately from AI model loading.
      // This prevents a model error from incorrectly showing a camera error.
      try {

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

        // The camera is working, so clear any old camera error immediately.
        setError("");

      } catch (cameraError) {

        console.error("Camera error:", cameraError);

        setError(
          "Unable to access camera. Please allow camera permission."
        );

        return;
      }


      if (!videoRef.current) {
        return;
      }


      videoRef.current.srcObject = stream;

      try {
        await videoRef.current.play();
        onVideoReady?.(videoRef.current);

        faceLandmarker = await createFaceLandmarker();
      } catch (setupError) {
        console.error("StressSense setup error:", setupError);

        // The camera is already working, so do NOT show a camera-permission error.
        setError("Camera is connected. AI analysis is still starting...");
      }


        const detectFace = async () => {

          if (!videoRef.current || !faceLandmarker) {

            animationFrameId =
              requestAnimationFrame(detectFace);

            return;
          }


          const video = videoRef.current;


          if (video.readyState < 2) {

            animationFrameId =
              requestAnimationFrame(detectFace);

            return;
          }


          try {

            const results =
              faceLandmarker.detectForVideo(
                video,
                performance.now()
              );


            if (
              !results.faceLandmarks ||
              results.faceLandmarks.length === 0
            ) {

              setFaceDetected(false);

              animationFrameId =
                requestAnimationFrame(detectFace);

              return;
            }


            setFaceDetected(true);

            // The camera preview can run before a session starts,
            // but stress analysis only runs during an active session.
            if (!sessionActiveRef.current) {
              animationFrameId =
                requestAnimationFrame(detectFace);
              return;
            }

            const landmarks =
              results.faceLandmarks[0];


            // -----------------------------
            // EYE MOVEMENT
            // -----------------------------

            const eyeValue =
              calculateEyeAspectRatio(landmarks);

            setEyeRatio(eyeValue);


            // -----------------------------
            // HEAD MOVEMENT
            // -----------------------------

            const headValue =
              calculateHeadMovement(
                landmarks,
                previousHeadRef.current
              );

            previousHeadRef.current = landmarks;

            setHeadMovement(headValue);


            // -----------------------------
            // FACIAL MOVEMENT
            // -----------------------------

            let facialValue = 0;

            if (
              results.faceBlendshapes &&
              results.faceBlendshapes.length > 0
            ) {

              const categories =
                results.faceBlendshapes[0]
                  .categories;

              if (categories.length > 0) {

                facialValue =
                  categories.reduce(
                    (sum, item) =>
                      sum + item.score,
                    0
                  ) / categories.length;

              }

            }

            setFacialMovement(facialValue);


            // -----------------------------
            // BASELINE CREATION
            // -----------------------------

            if (!baselineRef.current) {

              baselineSamplesRef.current.push({
                eye: eyeValue,
                head: headValue,
                facial: facialValue
              });


              if (
                baselineSamplesRef.current.length >=
                100
              ) {

                const newBaseline =
                  createBaseline(
                    baselineSamplesRef.current
                  );


                baselineRef.current =
                  newBaseline;

                setBaseline(newBaseline);

              }

            }


            // -----------------------------
            // BASELINE DIFFERENCE
            // -----------------------------

            let differences = {
              eye: 0,
              head: 0,
              facial: 0
            };


            if (baselineRef.current) {

              differences =
                differenceFromBaseline(
                  {
                    eye: eyeValue,
                    head: headValue,
                    facial: facialValue
                  },
                  baselineRef.current
                );


              setBaselineDifference(
                differences
              );

            }


            // -----------------------------
            // STRESS SCORE
            // -----------------------------

            const score =
              calculateStressScore(
                differences.eye,
                differences.head,
                differences.facial
              );


            const level =
              getStressLevel(score);


            setStressScore(score);

            setStressLevel(level);


            // -----------------------------
            // STRESS HISTORY
            // -----------------------------

            const currentTime = Date.now();


            if (
              currentTime -
              lastHistoryTimeRef.current >=
              5000
            ) {

              lastHistoryTimeRef.current =
                currentTime;


              setScoreHistory(
                (previousScores) => {

                  const updatedScores =
                    addScore(
                      previousScores,
                      score
                    );


                  const trend =
                    getTrend(
                      updatedScores
                    );


                  setStressTrend(trend);


                  const advice =
                    getRecommendation(
                      score,
                      trend
                    );


                  setRecommendation(
                    advice
                  );


                  return updatedScores;

                }
              );

            }


            // -----------------------------
            // STRESS REASONS
            // -----------------------------

            const reasons =
              getStressReasons(
                differences.eye,
                differences.head,
                differences.facial
              );


            setStressReasons(reasons);


          } catch (detectionError) {

            console.error(
              "Face detection error:",
              detectionError
            );

          }


          animationFrameId =
            requestAnimationFrame(
              detectFace
            );

        };


        detectFace();


    };


    startCamera();


    return () => {

      cancelAnimationFrame(
        animationFrameId
      );


      if (stream) {

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

      }

    };

    // Camera should initialize once.
    // onVideoReady is only a notification callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // -----------------------------
  // CHART DATA
  // -----------------------------

  const chartData =
    scoreHistory.map(
      (score, index) => ({
        reading: index + 1,
        stress: score
      })
    );


  // -----------------------------
  // SESSION SUMMARY
  // -----------------------------

  const sessionSummary =
    calculateSessionSummary(
      scoreHistory
    );


  // -----------------------------
  // UI HELPERS
  // -----------------------------

  const getStressClass = () => {

    if (stressLevel === "High") {
      return "stress-high";
    }

    if (stressLevel === "Moderate") {
      return "stress-moderate";
    }

    return "stress-low";

  };


  const startSession = () => {
    baselineSamplesRef.current = [];
    baselineRef.current = null;
    previousHeadRef.current = null;
    lastHistoryTimeRef.current = 0;

    setBaseline(null);
    setBaselineDifference({
      eye: 0,
      head: 0,
      facial: 0
    });

    setScoreHistory([]);
    setSessionSeconds(0);
    setStressScore(0);
    setStressLevel("Low");
    setStressTrend("Stable");
    setStressReasons([]);
    setRecommendation("");
    setSessionEnded(false);

    sessionActiveRef.current = true;
    setSessionActive(true);
    setError("");
  };

  const endSession = () => {
    sessionActiveRef.current = false;
    setSessionActive(false);
    setSessionEnded(true);
  };

  const getSessionStatusText = () => {
    if (sessionActive) return "Monitoring Active";
    if (sessionEnded) return "Session Complete";
    return "Ready to Start";
  };


  useEffect(() => {
    if (!sessionActive) return;

    const timer = setInterval(() => {
      setSessionSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive]);

  const formatSessionTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const getMainStressFactors = () => {
    if (stressReasons.length > 0) return stressReasons;
    return ["No strong pattern differences detected from the current baseline."];
  };

  const downloadSessionReport = () => {
    if (scoreHistory.length === 0) return;

    const report = [
      "STRESSSENSE - SESSION REPORT",
      "================================",
      `Generated: ${new Date().toLocaleString()}`,
      `Session Duration: ${formatSessionTime(sessionSeconds)}`,
      `Readings Collected: ${scoreHistory.length}`,
      "",
      "SESSION SUMMARY",
      "---------------",
      `Average Stress Score: ${sessionSummary.average}/100`,
      `Highest Stress Score: ${sessionSummary.highest}/100`,
      `Lowest Stress Score: ${sessionSummary.lowest}/100`,
      `Overall Level: ${sessionSummary.level}`,
      `Trend: ${sessionSummary.trend}`,
      "",
      "KEY OBSERVATIONS",
      "-----------------",
      ...getMainStressFactors().map((reason, index) => `${index + 1}. ${reason}`),
      "",
      "RECOMMENDATION",
      "--------------",
      recommendation || "Continue monitoring your stress pattern.",
      "",
      "DISCLAIMER",
      "----------",
      "StressSense provides pattern-based insights for learning and wellness awareness. It is not a medical diagnostic system."
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StressSense-Session-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const getTrendIcon = () => {

    if (stressTrend === "Increasing") {
      return "↗";
    }

    if (stressTrend === "Decreasing") {
      return "↘";
    }

    return "→";

  };


  return (

    <div className="stress-dashboard">

      {/* =========================
          SESSION CONTROL
      ========================= */}

      <section className="session-control-card">
        <div className="session-control-content">
          <div>
            <span className="card-label">SESSION CONTROL</span>
            <h3>{getSessionStatusText()}</h3>
            <p>
              {sessionActive
                ? "StressSense is actively analyzing your live facial and movement patterns."
                : sessionEnded
                  ? "Your session has ended. Review the summary below or start a new session."
                  : "Start a session when you are ready. Your camera preview can remain visible before analysis begins."}
            </p>
          </div>

          <div className="session-timer">
            <span className="session-timer-icon">⏱</span>
            <div>
              <small>SESSION TIME</small>
              <strong>{formatSessionTime(sessionSeconds)}</strong>
            </div>
          </div>

          <div className="session-control-actions">
            {!sessionActive ? (
              <button
                className="session-start-button"
                onClick={startSession}
              >
                <span>▶</span>
                {sessionEnded ? "Start New Session" : "Start Stress Analysis"}
              </button>
            ) : (
              <button
                className="session-end-button"
                onClick={endSession}
              >
                <span>■</span>
                End Session
              </button>
            )}
          </div>
        </div>

        <div className={`session-state ${sessionActive ? "active" : sessionEnded ? "complete" : ""}`}>
          <span></span>
          {sessionActive
            ? "LIVE ANALYSIS"
            : sessionEnded
              ? "SESSION COMPLETE"
              : "NOT STARTED"}
        </div>
      </section>


      {/* =========================
          CAMERA AREA
      ========================= */}

      <div
        className="camera-stage clickable-card"
        onClick={() => setSelectedDetail("camera")}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setSelectedDetail("camera");
          }
        }}
      >

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />

        <div className="camera-overlay">

          <div className="camera-corner top-left"></div>
          <div className="camera-corner top-right"></div>
          <div className="camera-corner bottom-left"></div>
          <div className="camera-corner bottom-right"></div>

          <div className="scan-line"></div>

        </div>


        <div className="camera-status">

          <span
            className={
              faceDetected
                ? "camera-status-dot detected"
                : "camera-status-dot"
            }
          ></span>

          {sessionActive
            ? faceDetected
              ? "Face detected • Analyzing"
              : "Searching for face..."
            : faceDetected
              ? "Face detected • Ready"
              : "Camera ready"}

        </div>

      </div>


      {/* =========================
          ERROR
      ========================= */}

      {error && (

        <div className="error-card">

          <span>⚠️</span>

          <div>
            <strong>Camera Access</strong>
            <p>{error}</p>
          </div>

        </div>

      )}


      {/* =========================
          STRESS SCORE HERO
      ========================= */}

      <section
        className="stress-score-card clickable-card"
        onClick={() => setSelectedDetail("score")}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setSelectedDetail("score");
          }
        }}
      >

        <div className="stress-score-info">

          <span className="card-label">
            CURRENT STRESS PATTERN
          </span>

          <h2>Stress Score</h2>

          <p>
            Compared with your personal baseline
          </p>

        </div>


        <div className="score-display">

          <div
            className={`score-ring ${getStressClass()}`}
          >

            <div className="score-inner">

              <strong>
                {stressScore}
              </strong>

              <span>/100</span>

            </div>

          </div>


          <div className="score-status">

            <span
              className={`stress-pill ${getStressClass()}`}
            >
              {stressLevel}
            </span>

            <div className="trend-display">

              <span className="trend-icon">
                {getTrendIcon()}
              </span>

              <span>
                {stressTrend}
              </span>

            </div>

          </div>

        </div>

        <div className="click-hint">
          Click to view detailed analysis →
        </div>

      </section>


      {/* =========================
          LIVE METRICS
      ========================= */}

      <section className="metrics-section">

        <div className="section-heading">

          <div>
            <span className="card-label">
              REAL-TIME SIGNALS
            </span>

            <h3>Live Measurements</h3>
          </div>

          <span className="ai-badge">
            ✦ AI ANALYSIS
          </span>

        </div>


        <div className="metrics-grid">

          <div className="metric-card clickable-card" onClick={() => setSelectedDetail("eye")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("eye"); }}>

            <div className="metric-icon blue">
              👁️
            </div>

            <div className="metric-content">

              <span>Eye Ratio</span>

              <strong>
                {eyeRatio.toFixed(3)}
              </strong>

              <small>
                Blink / eye pattern
              </small>

            </div>

          </div>


          <div className="metric-card clickable-card" onClick={() => setSelectedDetail("head")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("head"); }}>

            <div className="metric-icon purple">
              ↕
            </div>

            <div className="metric-content">

              <span>Head Movement</span>

              <strong>
                {headMovement.toFixed(3)}
              </strong>

              <small>
                Head motion signal
              </small>

            </div>

          </div>


          <div className="metric-card clickable-card" onClick={() => setSelectedDetail("facial")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("facial"); }}>

            <div className="metric-icon cyan">
              ◉
            </div>

            <div className="metric-content">

              <span>Facial Movement</span>

              <strong>
                {facialMovement.toFixed(3)}
              </strong>

              <small>
                Facial activity
              </small>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          BASELINE
      ========================= */}

      <section className="baseline-card clickable-card" onClick={() => setSelectedDetail("baseline")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("baseline"); }}>

        <div className="section-heading">

          <div>

            <span className="card-label">
              PERSONALIZATION
            </span>

            <h3>Personal Baseline</h3>

          </div>

          <div
            className={
              baseline
                ? "baseline-status ready"
                : "baseline-status"
            }
          >
            <span></span>

            {baseline
              ? "Baseline Ready"
              : "Learning Pattern"}

          </div>

        </div>


        {baseline ? (

          <div className="baseline-grid">

            <div className="baseline-item">

              <span>Eye Difference</span>

              <strong>
                {baselineDifference.eye.toFixed(3)}
              </strong>

            </div>


            <div className="baseline-item">

              <span>Head Difference</span>

              <strong>
                {baselineDifference.head.toFixed(3)}
              </strong>

            </div>


            <div className="baseline-item">

              <span>Facial Difference</span>

              <strong>
                {baselineDifference.facial.toFixed(3)}
              </strong>

            </div>

          </div>

        ) : (

          <div className="baseline-learning">

            <div className="learning-orbit">
              ✦
            </div>

            <div>

              <strong>
                Creating your personal baseline
              </strong>

              <p>
                StressSense is learning your normal
                facial and movement patterns.
              </p>

            </div>

          </div>

        )}

      </section>


      {/* =========================
          EXPLANATION + RECOMMENDATION
      ========================= */}

      <section className="insights-grid">

        <div className="insight-card reasons-card clickable-card" onClick={() => setSelectedDetail("reasons")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("reasons"); }}>

          <div className="insight-title">

            <div className="insight-icon purple">
              ✦
            </div>

            <div>

              <span className="card-label">
                EXPLAINABLE AI
              </span>

              <h3>
                Why this reading?
              </h3>

            </div>

          </div>


          {stressReasons.length === 0 ? (

            <div className="empty-insight">

              <span>✓</span>

              <p>
                No strong stress signals detected.
              </p>

            </div>

          ) : (

            <ul className="reason-list">

              {stressReasons.map(
                (reason, index) => (

                  <li key={index}>

                    <span>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <p>{reason}</p>

                  </li>

                )
              )}

            </ul>

          )}

        </div>


        <div className="insight-card recommendation-card clickable-card" onClick={() => setSelectedDetail("recommendation")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("recommendation"); }}>

          <div className="insight-title">

            <div className="insight-icon blue">
              🧘
            </div>

            <div>

              <span className="card-label">
                WELLNESS SUGGESTION
              </span>

              <h3>
                Recommendation
              </h3>

            </div>

          </div>


          <div className="recommendation-content">

            <div className="recommendation-glow">
              ✦
            </div>

            <p>
              {recommendation ||
                "Continue monitoring your stress pattern."}
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          STRESS HISTORY
      ========================= */}

      <section className="history-card clickable-card" onClick={() => setSelectedDetail("history")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("history"); }}>

        <div className="section-heading">

          <div>

            <span className="card-label">
              SESSION TIMELINE
            </span>

            <h3>Stress History</h3>

          </div>

          <span className="reading-count">
            {scoreHistory.length} readings
          </span>

        </div>


        {scoreHistory.length === 0 ? (

          <div className="history-empty">

            <div className="history-icon">
              ◌
            </div>

            <p>
              Collecting stress readings...
            </p>

          </div>

        ) : (

          <div className="history-list">

            {scoreHistory.map(
              (score, index) => (

                <div
                  className="history-item"
                  key={index}
                >

                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="history-bar">

                    <div
                      className="history-fill"
                      style={{
                        width: `${score}%`
                      }}
                    ></div>

                  </div>

                  <strong>
                    {score}
                  </strong>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* =========================
          STRESS GRAPH
      ========================= */}

      <section className="graph-card clickable-card" onClick={() => setSelectedDetail("trend")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("trend"); }}>

        <div className="section-heading">

          <div>

            <span className="card-label">
              PATTERN VISUALIZATION
            </span>

            <h3>Stress Trend</h3>

          </div>

          <div className="graph-trend">

            <span>
              {getTrendIcon()}
            </span>

            {stressTrend}

          </div>

        </div>


        {scoreHistory.length < 2 ? (

          <div className="graph-empty">

            <div className="graph-placeholder">
              <span>⌁</span>
            </div>

            <p>
              Collecting more readings for the graph...
            </p>

          </div>

        ) : (

          <div className="graph-wrapper">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: -15,
                  bottom: 5
                }}
              >

                <CartesianGrid
                  stroke="rgba(150,160,210,0.08)"
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="reading"
                  stroke="#59637f"
                  tick={{
                    fill: "#69738f",
                    fontSize: 10
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  stroke="#59637f"
                  tick={{
                    fill: "#69738f",
                    fontSize: 10
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#11182e",
                    border:
                      "1px solid rgba(130,145,220,0.15)",
                    borderRadius: "10px",
                    color: "#e8ecff"
                  }}
                  labelStyle={{
                    color: "#8e99ba"
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke="#8c7cff"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    fill: "#8c7cff"
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#a99dff"
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        )}

      </section>


      {/* =========================
          SESSION SUMMARY
      ========================= */}

      <section className="summary-card clickable-card" onClick={() => setSelectedDetail("summary")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedDetail("summary"); }}>
        <div className="section-heading">
          <div>
            <span className="card-label">SESSION INSIGHTS</span>
            <h3>Session Summary</h3>
          </div>
          <div className="summary-icon">◈</div>
        </div>

        {scoreHistory.length === 0 ? (
          <div className="summary-empty">
            <div className="summary-empty-icon">◌</div>
            <p>Start a session and collect stress readings to generate your summary.</p>
          </div>
        ) : (
          <>
            <div className="summary-highlight">
              <div>
                <span className="summary-highlight-label">OVERALL PATTERN</span>
                <strong>{sessionSummary.level}</strong>
                <p>{sessionEnded ? "Session completed successfully." : "Session is currently being monitored."}</p>
              </div>
              <div className="summary-highlight-score">
                {sessionSummary.average}<small>/100</small>
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-item"><span>Average</span><strong>{sessionSummary.average}</strong><small>/100</small></div>
              <div className="summary-item"><span>Highest</span><strong>{sessionSummary.highest}</strong><small>/100</small></div>
              <div className="summary-item"><span>Lowest</span><strong>{sessionSummary.lowest}</strong><small>/100</small></div>
              <div className="summary-item"><span>Duration</span><strong>{formatSessionTime(sessionSeconds)}</strong></div>
              <div className="summary-item"><span>Readings</span><strong>{scoreHistory.length}</strong></div>
              <div className="summary-item"><span>Trend</span><strong className="summary-trend">{sessionSummary.trend}</strong></div>
            </div>

            <div className="summary-observation">
              <span>✦</span>
              <div><strong>Key observation</strong><p>{getMainStressFactors()[0]}</p></div>
            </div>

            <button className="report-button" onClick={(event) => { event.stopPropagation(); downloadSessionReport(); }}>
              <span>↓</span>Download Session Report
            </button>
          </>
        )}
      </section>


      <div className="dashboard-disclaimer">

        <span>ⓘ</span>

        StressSense provides pattern-based insights
        for learning and wellness awareness. It is
        not a medical diagnostic system.

      </div>


      {/* =========================
          INTERACTIVE DETAILS MODAL
      ========================= */}

      {selectedDetail && (

        <div
          className="score-modal-backdrop"
          onClick={() => setSelectedDetail(null)}
        >

          <div
            className="score-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="score-modal-header">
              <div>
                <span className="card-label">
                  {selectedDetail === "camera" && "LIVE MONITORING"}
                  {selectedDetail === "score" && "STRESS ANALYSIS"}
                  {selectedDetail === "eye" && "LIVE SIGNAL"}
                  {selectedDetail === "head" && "LIVE SIGNAL"}
                  {selectedDetail === "facial" && "LIVE SIGNAL"}
                  {selectedDetail === "baseline" && "PERSONALIZATION"}
                  {selectedDetail === "reasons" && "EXPLAINABLE AI"}
                  {selectedDetail === "recommendation" && "WELLNESS SUGGESTION"}
                  {selectedDetail === "history" && "SESSION TIMELINE"}
                  {selectedDetail === "trend" && "PATTERN VISUALIZATION"}
                  {selectedDetail === "summary" && "SESSION INSIGHTS"}
                </span>

                <h2>
                  {selectedDetail === "camera" && "Live Camera Analysis"}
                  {selectedDetail === "score" && "Stress Score Details"}
                  {selectedDetail === "eye" && "Eye Ratio"}
                  {selectedDetail === "head" && "Head Movement"}
                  {selectedDetail === "facial" && "Facial Movement"}
                  {selectedDetail === "baseline" && "Personal Baseline"}
                  {selectedDetail === "reasons" && "Why this reading?"}
                  {selectedDetail === "recommendation" && "Recommendation"}
                  {selectedDetail === "history" && "Stress History"}
                  {selectedDetail === "trend" && "Stress Trend"}
                  {selectedDetail === "summary" && "Session Summary"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedDetail(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            {selectedDetail === "camera" && (
                <>
                  <div className="modal-score">
                    <div className="modal-score-number">{faceDetected ? "✓" : "…"}</div>
                    <div className="modal-score-label">Camera Analysis</div>
                    <div className="modal-stress-level">
                      {faceDetected ? "Monitoring Active" : "Searching"}
                    </div>
                  </div>

                  <div className="modal-description">
                    <p>
                      StressSense is analyzing facial and movement patterns from the live camera feed and comparing them with your personal baseline.
                    </p>
                  </div>

                  <div className="modal-metrics">
                    <div className="modal-metric">
                      <span>📷</span>
                      <strong>Camera</strong>
                      <small>{error ? "Issue" : "Ready"}</small>
                    </div>
                    <div className="modal-metric">
                      <span>👤</span>
                      <strong>Face</strong>
                      <small>{faceDetected ? "Detected" : "Searching"}</small>
                    </div>
                    <div className="modal-metric">
                      <span>🧠</span>
                      <strong>Analysis</strong>
                      <small>Real-time</small>
                    </div>
                  </div>

                  <div className="modal-insight">
                    <span>✦</span>
                    <div>
                      <strong>Live Insight</strong>
                      <p>
                        {faceDetected
                          ? "Your face is currently visible to the analysis system. Live signals are being measured."
                          : "Position your face inside the camera frame so StressSense can begin measuring your signals."}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {selectedDetail === "score" && (
              <>
                <div className="modal-score">
                  <div className="modal-score-number">{stressScore}</div>
                  <div className="modal-score-label">/ 100</div>
                  <div className={`modal-stress-level ${getStressClass()}`}>
                    {stressLevel}
                  </div>
                </div>
                <div className="modal-description"><p>Your current stress pattern score compares live facial and movement signals with your personal baseline.</p></div>
                <div className="modal-metrics">
                  <div className="modal-metric"><span>👁️</span><div><strong>Eye Difference</strong><small>{Number(baselineDifference.eye).toFixed(3)}</small></div></div>
                  <div className="modal-metric"><span>↕️</span><div><strong>Head Difference</strong><small>{Number(baselineDifference.head).toFixed(3)}</small></div></div>
                  <div className="modal-metric"><span>◉</span><div><strong>Facial Difference</strong><small>{Number(baselineDifference.facial).toFixed(3)}</small></div></div>
                </div>
                <div className="modal-insight"><span>✦</span><div><strong>AI Insight</strong><p>{stressReasons.length > 0 ? stressReasons.join(" ") : "Your current facial and movement patterns are close to your personal baseline."}</p></div></div>
                <div className="modal-trend"><span>{getTrendIcon()}</span><div><strong>Current Trend</strong><p>{stressTrend}</p></div></div>
              </>
            )}

            {selectedDetail === "eye" && (
              <DetailContent icon="👁️" value={eyeRatio.toFixed(3)} description="Eye Aspect Ratio measures the relative opening of the eye. StressSense uses changes from your personal baseline rather than treating one value as universally stressful." />
            )}

            {selectedDetail === "head" && (
              <DetailContent icon="↕️" value={headMovement.toFixed(3)} description="This signal represents the amount of head movement between consecutive readings. Larger changes can contribute to the pattern comparison." />
            )}

            {selectedDetail === "facial" && (
              <DetailContent icon="◉" value={facialMovement.toFixed(3)} description="Facial Movement summarizes the current facial blendshape activity detected by the model and compares it with your baseline." />
            )}

            {selectedDetail === "baseline" && (
              <div className="modal-description">
                <p>{baseline ? "Your personal baseline has been created from your initial readings. Current values are compared against this learned pattern." : "Your baseline is still being created. Keep your face naturally visible while StressSense learns your normal pattern."}</p>
                <div className="modal-metrics">
                  <div className="modal-metric"><span>👁️</span><div><strong>Eye Difference</strong><small>{baselineDifference.eye.toFixed(3)}</small></div></div>
                  <div className="modal-metric"><span>↕️</span><div><strong>Head Difference</strong><small>{baselineDifference.head.toFixed(3)}</small></div></div>
                  <div className="modal-metric"><span>◉</span><div><strong>Facial Difference</strong><small>{baselineDifference.facial.toFixed(3)}</small></div></div>
                </div>
              </div>
            )}

            {selectedDetail === "reasons" && (
              <div className="modal-description"><p>{stressReasons.length > 0 ? stressReasons.join(" ") : "No strong pattern differences are currently detected compared with your personal baseline."}</p></div>
            )}

            {selectedDetail === "recommendation" && (
              <div className="modal-insight"><span>🧘</span><div><strong>Current suggestion</strong><p>{recommendation || "Continue monitoring your stress pattern."}</p></div></div>
            )}

            {selectedDetail === "history" && (
              <div className="modal-description"><p>{scoreHistory.length > 0 ? `StressSense has collected ${scoreHistory.length} readings. The history shows how the calculated score has changed during this session.` : "No stress readings have been collected yet."}</p></div>
            )}

            {selectedDetail === "trend" && (
              <div className="modal-trend"><span>{getTrendIcon()}</span><div><strong>Current Trend</strong><p>{stressTrend}</p></div></div>
            )}

            {selectedDetail === "summary" && (
              <>
                <div className="modal-metrics">
                  <div className="modal-metric"><span>∿</span><div><strong>Average</strong><small>{sessionSummary.average}/100</small></div></div>
                  <div className="modal-metric"><span>↑</span><div><strong>Highest</strong><small>{sessionSummary.highest}/100</small></div></div>
                  <div className="modal-metric"><span>↓</span><div><strong>Lowest</strong><small>{sessionSummary.lowest}/100</small></div></div>
                  <div className="modal-metric"><span>⏱</span><div><strong>Duration</strong><small>{formatSessionTime(sessionSeconds)}</small></div></div>
                  <div className="modal-metric"><span>◉</span><div><strong>Readings</strong><small>{scoreHistory.length}</small></div></div>
                  <div className="modal-metric"><span>↗</span><div><strong>Trend</strong><small>{sessionSummary.trend}</small></div></div>
                </div>
                <div className="modal-insight"><span>✦</span><div><strong>Key Observation</strong><p>{getMainStressFactors()[0]}</p></div></div>
                <button className="modal-report-button" onClick={downloadSessionReport} disabled={scoreHistory.length === 0}>↓ Download Session Report</button>
              </>
            )}

            <button
              className="modal-done-button"
              onClick={() => setSelectedDetail(null)}
            >
              Close Details
            </button>

          </div>

        </div>

      )}

    </div>

  );
}