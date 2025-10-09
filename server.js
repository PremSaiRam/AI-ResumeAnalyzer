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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Serve static frontend
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

// ✅ Helper: Get a valid Gemini model automatically
async function getValidModel() {
  try {
    const res = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    const models = res.data.models.map((m) => m.name);
    console.log("✅ Available models:", models);

    // Pick best available model
    return (
      models.find((m) => m.includes("gemini")) ||
      "models/gemini-1.5-pro-latest"
    );
  } catch (err) {
    console.error("❌ Could not fetch model list:", err.message);
    return "models/gemini-1.5-pro-latest";
  }
}

// ✅ Analyze resume route
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!GEMINI_API_KEY)
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const model = await getValidModel();

    const filePath = path.resolve(req.file.path);
    const fileData = fs.readFileSync(filePath);
    const encodedFile = fileData.toString("base64");

    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Analyze this resume and provide a clear evaluation of structure, skills, and improvements.",
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
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
      payload,
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
    console.error("❌ Gemini API Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error analyzing resume",
      details: error.response?.data || error.message,
    });
  }
});

// ✅ Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
