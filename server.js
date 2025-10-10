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
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// temporary in-memory users + history (no database for simplicity)
const users = [];
const history = {}; // { email: [ {score, strengths, weaknesses, date} ] }

// ---------- AUTH ROUTES ----------
app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }
  users.push({ email, password });
  history[email] = [];
  res.json({ message: "Signup successful" });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  res.json({ message: "Login successful", email });
});

// ---------- RESUME ANALYZER ----------
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
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
          {
            role: "user",
            content: `Analyze this resume and return JSON like:
{
  "score": number (0-100),
  "strengths": [],
  "weaknesses": [],
  "suggestions": []
}
Resume:
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
    } catch {
      analysisJSON = { score: 0, strengths: [], weaknesses: [], suggestions: [] };
    }

    // Save to history if email provided
    const email = req.query.email;
    if (email && history[email]) {
      history[email].push({ ...analysisJSON, date: new Date().toLocaleString() });
    }

    res.json(analysisJSON);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

// ---------- FETCH HISTORY ----------
app.get("/history", (req, res) => {
  const email = req.query.email;
  res.json(history[email] || []);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
