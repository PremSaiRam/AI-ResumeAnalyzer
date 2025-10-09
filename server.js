// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Serve static frontend files
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

// 🧠 Resume analysis route
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    const fileData = fs.readFileSync(filePath);
    const encodedFile = fileData.toString("base64");

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables");
      return res.status(500).json({ error: "Missing API key" });
    }

    // ✅ Use supported Gemini model
    const modelName = "gemini-2.0-flash";

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Analyze this resume and give a professional summary including key strengths, weaknesses, and improvement suggestions.",
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: encodedFile,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
      }
    );

    // ✅ Cleanup temporary file
    fs.unlinkSync(filePath);

    // ✅ Log full Gemini response for debugging
    console.log(
      "Gemini API raw response:",
      JSON.stringify(response.data, null, 2)
    );

    // ✅ Extract text safely
    const candidates = response.data.candidates || [];
    let summary = "No analysis returned.";
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      summary = parts.map((p) => p.text).join("\n").trim() || summary;
    }

    res.json({ summary });
  } catch (error) {
    console.error("Gemini API Error:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Error analyzing resume",
      details: error?.response?.data || error.message,
    });
  }
});

// ✅ Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
