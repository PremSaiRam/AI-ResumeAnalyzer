import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Ensure uploads folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static frontend files
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

// Gemini API route
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = path.resolve(req.file.path);
    const fileData = fs.readFileSync(filePath);
    const encodedFile = fileData.toString("base64");

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables");
      return res.status(500).json({ error: "Missing API key" });
    }

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              { text: "Analyze this resume and provide feedback on skills, structure, and improvements." },
              { inlineData: { mimeType: "application/pdf", data: encodedFile } },
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

    fs.unlinkSync(filePath);
    res.json(response.data);
  } catch (error) {
    console.error("Gemini API Error:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Error analyzing resume",
      details: error?.response?.data || error.message,
    });
  }
});

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
