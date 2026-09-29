const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/user");

const router = express.Router();


// ===============================
// SIGN UP
// ===============================

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash
    });

    // Automatically log the user in after signup.
    req.session.userId = user._id.toString();

    req.session.save((sessionError) => {
      if (sessionError) {
        console.error(
          "Session save error:",
          sessionError
        );

        return res.status(500).json({
          success: false,
          message: "Account created, but login session could not be created."
        });
      }

      return res.status(201).json({
        success: true,
        message: "Account created successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
});


// ===============================
// LOGIN
// ===============================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: cleanEmail
    });

    // Same message for unknown email and wrong password.
    // This prevents revealing whether an account exists.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Prevent session fixation.
    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error(
          "Session regeneration error:",
          sessionError
        );

        return res.status(500).json({
          success: false,
          message: "Unable to create login session."
        });
      }

      req.session.userId =
        user._id.toString();

      req.session.save((saveError) => {
        if (saveError) {
          console.error(
            "Session save error:",
            saveError
          );

          return res.status(500).json({
            success: false,
            message: "Unable to save login session."
          });
        }

        return res.json({
          success: true,
          message: "Login successful.",
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to login."
    });
  }
});


// ===============================
// CURRENT USER
// ===============================

router.get("/me", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated."
      });
    }

    const user = await User.findById(
      req.session.userId
    ).select(
      "_id name email createdAt"
    );

    if (!user) {
      req.session.destroy(() => {});

      return res.status(401).json({
        success: false,
        message: "User account no longer exists."
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to get current user."
    });
  }
});


// ===============================
// LOGOUT
// ===============================

router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: "Logged out successfully."
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error(
        "Logout error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to logout."
      });
    }

    res.clearCookie("stresssense.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    return res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});


module.exports = router;