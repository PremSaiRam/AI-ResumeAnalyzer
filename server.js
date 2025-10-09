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
    const fileName = req.file.originalname.toLowerCase();
    let resumeText = "";

    if (fileName.endsWith(".docx")) {
      const docData = await mammoth.extractRawText({ path: filePath });
      resumeText = docData.value;
    } else if (fileName.endsWith(".txt")) {
      resumeText = fs.readFileSync(filePath, "utf-8");
    } else if (fileName.endsWith(".pdf")) {
      // Read PDF as Base64
      const fileData = fs.readFileSync(filePath);
      resumeText = fileData.toString("base64");
      // Optional: indicate to OpenAI that this is PDF Base64
      resumeText = `PDF Base64:\n${resumeText}`;
    } else {
      resumeText = "Unsupported file format.";
    }

    fs.unlinkSync(filePath);

    if (!resumeText.trim()) {
      return res.json({ text: "⚠️ Resume text is empty or could not be extracted." });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: `Analyze this resume and provide a detailed, professional assessment:\n\n${resumeText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const result = await response.json();
    const responseText = result?.choices?.[0]?.message?.content || "No analysis returned.";

    res.json({ text: responseText });
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
