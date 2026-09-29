const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

require("dotenv").config();


// ===============================
// ROUTES
// ===============================

const sessionRoutes =
  require("./routes/sessionRoutes");

const authRoutes =
  require("./routes/authRoutes");

const examScreenshotRoutes =
  require("./routes/examScreenshotRoutes");


// ===============================
// APP
// ===============================

const app = express();


// ===============================
// CORS
// ===============================

app.use(
  cors({
    origin: "http://localhost:5173",
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
      maxAge:
        1000 * 60 * 60 * 24 * 7
    }
  })
);


// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "StressSense backend is running 🚀"
  });
});


// ===============================
// AUTH API
// ===============================

app.use(
  "/api/auth",
  authRoutes
);


// ===============================
// EXAM SESSION API
// ===============================

app.use(
  "/api/sessions",
  sessionRoutes
);


// ===============================
// EXAM SCREENSHOT API
// ===============================

app.use(
  "/api/exam-screenshots",
  examScreenshotRoutes
);


// ===============================
// START SERVER
// ===============================
app.use((error, req, res, next) => {
  console.error("❌ BACKEND ERROR:", error);

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

mongoose
  .connect(process.env.MONGODB_URI)

  .then(() => {
    console.log(
      "✅ MongoDB connected successfully"
    );

    const PORT =
      process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        `🚀 StressSense backend running on http://localhost:${PORT}`
      );
    });
  })

  .catch((error) => {
    console.error(
      "❌ MongoDB connection failed:",
      error.message
    );
  });