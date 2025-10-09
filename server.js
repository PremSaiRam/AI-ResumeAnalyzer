import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const fileBase64 = fileData.toString("base64");

    // Gemini API REST call
    const response = await fetch("https://gemini.googleapis.com/v1/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: [
          { text: "Provide a detailed and professional resume analysis:" },
          {
            inlineData: {
              mimeType: req.file.mimetype,
              data: fileBase64
            }
          }
        ]
      })
    });

    const result = await response.json();

    const responseText = result?.candidates?.[0]?.content?.[0]?.text || "No analysis returned.";
    res.json({ text: responseText });

    fs.unlinkSync(filePath); // delete after processing
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
