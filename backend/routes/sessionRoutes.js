const express = require("express");

const ExamSession =
  require("../models/ExamSession");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// SAVE EXAM SESSION
// ===============================

router.post(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const session = await ExamSession.create({
        ...req.body,
        userId: req.session.userId
      });

      res.status(201).json({
        success: true,
        message: "Exam session saved successfully",
        session
      });
    } catch (error) {
      console.error(
        "Save session error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to save exam session",
        error: error.message
      });
    }
  }
);


// ===============================
// GET ALL SESSIONS
// ===============================

router.get(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const sessions =
        await ExamSession.find({
          userId: req.session.userId
        }).sort({
          createdAt: -1
        });

      res.json({
        success: true,
        count: sessions.length,
        sessions
      });
    } catch (error) {
      console.error(
        "Get sessions error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch exam sessions"
      });
    }
  }
);


// ===============================
// GET ONE SESSION
// ===============================

router.get(
  "/:id",
  requireAuth,
  async (req, res) => {
    try {
      const session =
        await ExamSession.findOne({
          _id: req.params.id,
          userId: req.session.userId
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Exam session not found"
        });
      }

      res.json({
        success: true,
        session
      });
    } catch (error) {
      console.error(
        "Get session error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to fetch exam session"
      });
    }
  }
);


module.exports = router;