const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const upload = multer({ dest: "uploads/" });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY environment variable!");
}

app.post("/analyze", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    console.error("❌ No file uploaded");
    return res.status(400).json({ error: "No resume file uploaded" });
  }

  const filePath = req.file.path;

  try {
    const fileData = fs.readFileSync(filePath).toString("base64");

    const prompt = `
You are an AI Resume Analyzer. Analyze the resume and give:
1. Overall score (0–100)
2. Strengths
3. Weaknesses
4. Suggestions for improvement.
Keep it short and helpful.
`;

    const response = await axios.post(
      // ✅ FIXED URL — now uses v1 instead of v1beta
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "application/pdf", data: fileData } }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        }
      }
    );

    const analysis =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No analysis found.";
    res.json({ analysis });
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error analyzing resume." });
  } finally {
    fs.unlinkSync(filePath);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
