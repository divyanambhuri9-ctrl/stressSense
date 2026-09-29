const mongoose = require("mongoose");

const examSessionSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      score: {
        type: Number,
        required: true
      },

      percentage: {
        type: Number,
        required: true
      },

      totalQuestions: {
        type: Number,
        required: true
      },

      correctAnswers: {
        type: Number,
        required: true
      },

      answeredQuestions: {
        type: Number,
        required: true
      },

      unansweredQuestions: {
        type: Number,
        required: true
      },

      focusedSeconds: {
        type: Number,
        default: 0
      },

      offScreenSeconds: {
        type: Number,
        default: 0
      },

      durationSeconds: {
        type: Number,
        default: 0
      },

      tabSwitchCount: {
        type: Number,
        default: 0
      },

      warnings: {
        type: Number,
        default: 0
      },

      answers: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },

      markedQuestions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },

      events: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
      },

      sessionSummary: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "ExamSession",
    examSessionSchema
  );