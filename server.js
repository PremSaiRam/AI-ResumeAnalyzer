/*
  AI Resume Analyzer - GitHub → Render deployment
  Uses Google Service Account JSON + OAuth for Gemini API
  No local files needed, fully works on Render
*/

// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// Service Account JSON from environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const fileBase64 = fileData.toString("base64");

    // Get OAuth token from Service Account
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    // Call Gemini REST API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          prompt: `Provide a detailed and professional resume analysis for this resume base64 content:\n${fileBase64}`,
          temperature: 0.2,
          maxOutputTokens: 1024
        })
      }
    );

    const result = await response.json();
    const responseText = result?.candidates?.[0]?.content?.[0]?.text || result?.outputText || "No analysis returned.";

    res.json({ text: responseText });
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
