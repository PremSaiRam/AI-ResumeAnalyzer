const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// REQUIRES INSTALLATION: npm install @google/genai
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = 3000;

// NOTE: In a production environment, this should be loaded from a secure environment variable.
// IMPORTANT: Replace this placeholder with your actual, valid Gemini API key.
const API_KEY = "AIzaSyD-G2TBVSGwYomdQe5XXNCHb3VNd0a2nro"; 

// Initialize the Gemini AI SDK
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Middleware Configuration ---
app.use(cors());
app.use(bodyParser.json());

// --- System Prompt Configuration ---
const systemPrompt = `You are a highly experienced professional resume analyst, acting as a virtual career coach. Your analysis must cover the following three mandatory sections, formatted clearly with bold titles: 

1. **Overall Score (1-100)**: Give a score and a brief justification.
2. **Structure and Readability**: Comment on the formatting, section ordering, conciseness, and visual flow.
3. **Content and Keyword Suggestions**: Identify weak areas, suggest better action verbs, and propose industry-relevant keywords or skills that could be added or emphasized.

Use a professional, encouraging, and highly detailed tone. Keep the entire response under 500 words. The very first line of your response MUST be a single score formatted exactly as: **Resume Score: [Score]/100** before any other text.`;

// --- Routes ---

// 1. Root route to serve the static HTML frontend (index.html is assumed)
app.get('/', (req, res) => {
    // __dirname is the directory where the current script is running
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API endpoint for resume analysis
app.post('/analyze-resume', async (req, res) => {
    const { resumeText } = req.body;

    // Input Validation
    if (!resumeText) {
        return res.status(400).json({ error: 'Resume text is required for analysis.' });
    }

    try {
        const userQuery = `Analyze the following resume text based on the system instructions:\n\n--- RESUME TEXT ---\n\n${resumeText.trim()}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-05-20",
            contents: [{
                role: "user",
                parts: [{ text: userQuery }],
            }],
            config: {
                systemInstruction: systemPrompt,
                // Max tokens to enforce the "under 500 words" constraint roughly
                maxOutputTokens: 1500, 
            },
        });

        const analysis = response.text;

        if (analysis) {
            // Send the raw analysis text back to the frontend
            return res.json({ analysis: analysis });
        } else {
            return res.status(500).json({ error: 'The AI model returned an empty response. Please check the content for inappropriate material and try again.' });
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        
        // Check for specific error status codes (e.g., 400 Bad Request for API Key issues)
        let errorMessage = 'Failed to perform AI analysis due to a server error.';
        // The SDK error object often contains details to help diagnose
        if (error.status === 400) {
            errorMessage = 'API Key or request format is invalid. Check your API key in server.js.';
        } else if (error.status === 429) {
            errorMessage = 'Rate limit exceeded. Try again in a minute.';
        }

        res.status(500).json({ error: errorMessage });
    }
});

// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Resume Analyzer backend listening at http://localhost:${PORT}`);
});
