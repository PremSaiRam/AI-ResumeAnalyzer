import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mammoth from "mammoth";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const mimetype = req.file.mimetype;

    let resumeText = "";

    // Only DOCX or TXT supported
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: filePath });
      resumeText = result.value;
    } else if (mimetype === "text/plain") {
      resumeText = fs.readFileSync(filePath, "utf-8");
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Only DOCX or TXT resumes are supported for now." });
    }

    fs.unlinkSync(filePath);

    if (!resumeText || resumeText.trim().length === 0) {
      return res.json({ text: "No text found in resume." });
    }

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional resume analyzer." },
          {
            role: "user",
            content: `Analyze this resume professionally and return a JSON with:
1. Overall score out of 100
2. Strengths
3. Weaknesses / Areas to Improve
4. Actionable Suggestions

Return ONLY JSON, example:
{
  "score": 85,
  "strengths": ["clear objective", "relevant skills", "projects"],
  "weaknesses": ["experience details not quantified", "soft skills missing"],
  "suggestions": ["quantify achievements", "highlight teamwork and communication", "add GitHub link"]
}

Resume Text:
${resumeText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    const result = await response.json();
    const analysisText = result.choices?.[0]?.message?.content;

    let analysisJSON;
    try {
      analysisJSON = JSON.parse(analysisText);
    } catch (err) {
      analysisJSON = { text: analysisText };
    }

    res.json({ text: analysisJSON });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
