import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import axios from "axios";

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.static("."));

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString("base64");

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("❌ Missing GEMINI_API_KEY environment variable!");
      return res.status(400).json({ error: "Gemini API key missing." });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              { text: "Analyze this resume and provide feedback with a score (0–100):" },
              { inline_data: { mime_type: "application/pdf", data: fileBase64 } }
            ]
          }
        ]
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const aiResult =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No analysis returned.";
    res.json({ result: aiResult });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error analyzing resume." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
