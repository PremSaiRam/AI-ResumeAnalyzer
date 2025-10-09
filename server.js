import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mammoth from "mammoth";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// PDF extraction function using pdfjs-dist
async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    text += strings.join(" ") + "\n";
  }
  return text;
}

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname.toLowerCase();
    let resumeText = "";

    if (fileName.endsWith(".pdf")) {
      resumeText = await extractPdfText(filePath);
    } else if (fileName.endsWith(".docx")) {
      const docData = await mammoth.extractRawText({ path: filePath });
      resumeText = docData.value;
    } else {
      resumeText = fs.readFileSync(filePath, "utf-8");
    }

    if (!resumeText.trim()) {
      fs.unlinkSync(filePath);
      return res.json({ text: "⚠️ Resume text is empty or could not be extracted." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: `Provide a detailed and professional resume analysis for the following resume:\n\n${resumeText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const result = await response.json();
    const responseText = result?.choices?.[0]?.message?.content || "No analysis returned.";

    res.json({ text: responseText });
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
