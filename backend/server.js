const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

require("dotenv").config();

// ===============================
// ROUTES
// ===============================

const sessionRoutes = require("./routes/sessionRoutes");
const authRoutes = require("./routes/authRoutes");
const examScreenshotRoutes = require("./routes/examScreenshotRoutes");

// ===============================
// APP
// ===============================

const app = express();

// ===============================
// CORS
// ===============================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://stress-sense-pi.vercel.app"
    ],
    credentials: true
  })
);

// ===============================
// JSON
// ===============================

app.use(
  express.json({
    limit: "10mb"
  })
);

// ===============================
// SESSION
// ===============================

app.use(
  session({
    name: "stresssense.sid",

    secret:
      process.env.SESSION_SECRET ||
      "stresssense-development-secret",

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions"
    }),

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StressSense backend is running 🚀"
  });
});

// ===============================
// AUTH API
// ===============================

app.use("/api/auth", authRoutes);

// ===============================
// EXAM SESSION API
// ===============================

app.use("/api/sessions", sessionRoutes);

// ===============================
// EXAM SCREENSHOT API
// ===============================

app.use(
  "/api/exam-screenshots",
  examScreenshotRoutes
);

// ===============================
// ERROR HANDLER
// ===============================

app.use((error, req, res, next) => {
  console.error("❌ BACKEND ERROR:", error);

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

// ===============================
// EXPORT APP FOR VERCEL
// ===============================

module.exports = app;