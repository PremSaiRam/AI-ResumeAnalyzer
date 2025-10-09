const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Securely read API keys from Render environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "/")));

app.post("/analyze", async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment variables.");
    return res.status(500).json({ error: "Gemini API key not configured on the server." });
  }

  const payload = req.body;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error (${response.status}): ${errText}`);
      return res.status(response.status).json({ error: `Gemini API error (${response.status}): ${errText}` });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server or network error while contacting Gemini API." });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
