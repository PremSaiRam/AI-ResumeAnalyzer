import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mammoth from "mammoth";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173" })); // React dev URL
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// in-memory
const history = {};

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const { email } = req.body;
    const filePath = req.file.path;
    const mimetype = req.file.mimetype;

    let resumeText = "";
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: filePath });
      resumeText = result.value;
    } else if (mimetype === "text/plain") {
      resumeText = fs.readFileSync(filePath, "utf-8");
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Only DOCX or TXT supported." });
    }
    fs.unlinkSync(filePath);

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
          { role: "user", content: `Analyze this resume and return JSON with score, strengths, weaknesses, suggestions.\nResume:\n${resumeText}` }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    let analysis = JSON.parse(content);

    if (email) {
      if (!history[email]) history[email] = [];
      history[email].push({ ...analysis, date: new Date().toLocaleString() });
    }

    res.json(analysis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

app.get("/history", (req, res) => {
  const email = req.query.email;
  res.json(history[email] || []);
});

app.listen(10000, () => console.log("🚀 Backend running on port 10000"));
