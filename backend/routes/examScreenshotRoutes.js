
const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const ExamScreenshot = require("../models/ExamScreenshot");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only JPG and PNG screenshots are allowed."));
  }
});

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  next();
}

function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "stresssense/exam-screenshots",
        public_id: publicId,
        resource_type: "image"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

// API health check
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Exam screenshot API is working"
  });
});

// Upload screenshot
router.post(
  "/",
  requireAuth,
  upload.single("screenshot"),
  async (req, res) => {
    let uploadedImage;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Screenshot file is required."
        });
      }

      const extension =
        req.file.mimetype === "image/png" ? "png" : "jpg";

      const fileName =
        `warning-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;

      const publicId = fileName.replace(/\.[^.]+$/, "");

      uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        publicId
      );

      const screenshot = await ExamScreenshot.create({
        userId: req.session.userId,
        eventId: req.body.eventId || null,
        eventType: req.body.eventType || "WARNING",
        message: req.body.message || "",
        examElapsedSeconds:
          Number(req.body.examElapsedSeconds) || 0,
        fileName,
        filePath: uploadedImage.secure_url,
        cloudinaryPublicId: uploadedImage.public_id
      });

      return res.status(201).json({
        success: true,
        message: "Screenshot uploaded successfully.",
        screenshot: {
          id: screenshot._id,
          eventId: screenshot.eventId,
          eventType: screenshot.eventType,
          message: screenshot.message,
          examElapsedSeconds: screenshot.examElapsedSeconds,
          fileName: screenshot.fileName,
          filePath: screenshot.filePath,
          createdAt: screenshot.createdAt
        }
      });
    } catch (error) {
      console.error("Screenshot upload failed:", error);

      // Avoid leaving an unreferenced Cloudinary image if DB saving fails.
      if (uploadedImage?.public_id) {
        try {
          await cloudinary.uploader.destroy(uploadedImage.public_id);
        } catch (cleanupError) {
          console.error("Cloudinary cleanup failed:", cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload screenshot."
      });
    }
  }
);

// Retrieve the logged-in user's screenshots
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const screenshots = await ExamScreenshot.find({
      userId: req.session.userId
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: screenshots.length,
      screenshots
    });
  } catch (error) {
    console.error("Screenshot retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve screenshots."
    });
  }
});

module.exports = router;
