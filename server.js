// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Securely load Gemini API key from Render environment variable
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash";

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "/")));

// --- Proxy Endpoint ---
app.post("/analyze", async (req, res) => {
  if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY missing in environment variables!");
    return res.status(500).json({ error: "Server missing API key." });
  }

  const frontendPayload = req.body;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(frontendPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Gemini API Error:", errorBody);
      return res.status(response.status).json(errorBody);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Proxy server or network error." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
