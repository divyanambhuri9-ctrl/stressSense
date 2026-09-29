const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ExamScreenshot =
  require("../models/ExamScreenshot");

const router = express.Router();


// ===============================
// UPLOAD DIRECTORY
// ===============================

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "exam-screenshots"
);


if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true
  });
}


// ===============================
// MULTER STORAGE
// ===============================

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        uploadDirectory
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const uniqueName =
        `warning-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}.jpg`;

      cb(
        null,
        uniqueName
      );
    }
  });


// ===============================
// MULTER
// ===============================

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      if (
        file.mimetype ===
          "image/jpeg" ||
        file.mimetype ===
          "image/png"
      ) {
        cb(
          null,
          true
        );
      } else {
        cb(
          new Error(
            "Only JPG and PNG screenshots are allowed."
          )
        );
      }
    }
  });


// ===============================
// AUTH CHECK
// ===============================

function requireAuth(
  req,
  res,
  next
) {
  if (!req.session.userId) {
    return res
      .status(401)
      .json({
        success: false,
        message:
          "Authentication required."
      });
  }

  next();
}


// ===============================
// UPLOAD SCREENSHOT
// ===============================
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Exam screenshot API is working 🚀"
  });
});

router.post(
  "/",
  requireAuth,
  upload.single("screenshot"),

  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Screenshot file is required."
          });
      }


      const screenshot =
        await ExamScreenshot.create({
          userId:
            req.session.userId,

          eventId:
            req.body.eventId ||
            null,

          eventType:
            req.body.eventType ||
            "WARNING",

          message:
            req.body.message ||
            "",

          examElapsedSeconds:
            Number(
              req.body
                .examElapsedSeconds
            ) || 0,

          fileName:
            req.file.filename,

          filePath:
            `uploads/exam-screenshots/${req.file.filename}`
        });


      res
        .status(201)
        .json({
          success: true,

          message:
            "Warning screenshot saved successfully.",

          screenshot: {
            id:
              screenshot._id,

            eventId:
              screenshot.eventId,

            eventType:
              screenshot.eventType,

            examElapsedSeconds:
              screenshot.examElapsedSeconds,

            fileName:
              screenshot.fileName,

            filePath:
              screenshot.filePath,

            createdAt:
              screenshot.createdAt
          }
        });
    } catch (error) {
      console.error(
        "❌ Screenshot upload failed:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to save screenshot."
        });
    }
  }
);


module.exports = router;