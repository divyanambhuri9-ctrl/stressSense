const mongoose = require("mongoose");

const examScreenshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    eventId: {
      type: String,
      default: null
    },

    eventType: {
      type: String,
      required: true
    },

    message: {
      type: String,
      default: ""
    },

    examElapsedSeconds: {
      type: Number,
      default: 0
    },

    fileName: {
      type: String,
      required: true
    },

    filePath: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "ExamScreenshot",
  examScreenshotSchema
);