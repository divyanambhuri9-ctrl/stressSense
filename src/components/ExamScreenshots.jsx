
import { useEffect, useState } from "react";

const API_URL =
  "https://stresssense-backend-r2d5.onrender.com";

export default function ExamScreenshots() {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchScreenshots() {
      try {
        const response = await fetch(
          `${API_URL}/api/exam-screenshots/mine`,
          { credentials: "include" }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load screenshots"
          );
        }

        setScreenshots(data.screenshots || []);
      } catch (err) {
        setError(err.message || "Could not load screenshots.");
      } finally {
        setLoading(false);
      }
    }

    fetchScreenshots();
  }, []);

  return (
    <section className="screenshots-section">
      <div className="screenshots-heading">
        <span className="card-label">EXAM RECORDS</span>
        <h2>📸 Exam Screenshots</h2>
        <p>Review screenshots recorded during your exam session.</p>
      </div>

      {loading && <p>Loading screenshots...</p>}

      {error && (
        <p role="alert">
          Could not load screenshots: {error}
        </p>
      )}

      {!loading && !error && screenshots.length === 0 && (
        <p>No screenshots found for your account.</p>
      )}

      {!loading && !error && screenshots.length > 0 && (
        <div className="screenshot-grid">
          {screenshots.map((item) => (
            <article
              key={item._id || item.id}
              className="screenshot-card"
            >
              <a
                href={item.filePath}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={item.filePath}
                  alt={`Screenshot: ${item.eventType}`}
                  className="exam-screenshot"
                  loading="lazy"
                />
              </a>

              <h3>{item.eventType}</h3>
              <p>{item.message}</p>
              <p>
                Exam time: {item.examElapsedSeconds ?? 0} seconds
              </p>
              <small>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : ""}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
