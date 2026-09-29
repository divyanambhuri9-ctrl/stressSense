const mongoose = require("mongoose");
const app = require("../server");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;

  console.log("MongoDB connected successfully");
}

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("MongoDB connection error:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
};