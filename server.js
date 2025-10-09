const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.static("public"));

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded.");
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const base64Data = Buffer.from(fileData).toString("base64");

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              { text: "Analyze this resume and give a score 0–100 with improvement suggestions:" },
              { inline_data: { mime_type: "application/pdf", data: base64Data } }
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

    fs.unlinkSync(filePath);
    res.json(response.data);
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    res.status(500).send("Error analyzing resume");
  }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
