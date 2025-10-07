const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
// The server will run on the port provided by the hosting environment (e.g., Render) or default to 3000.
const PORT = process.env.PORT || 3000;

// CRITICAL SECURITY STEP: Get API Key from environment variables, not hardcoded.
const apiKey = process.env.GEMINI_API_KEY;

// Check for API Key at startup
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
    // Exit process if key is missing, as the core functionality won't work.
}

// Initialize the GoogleGenAI instance
const ai = new GoogleGenAI(apiKey);

// Middleware
// 1. CORS: Allows your frontend (running on a different domain) to talk to this backend.
app.use(cors()); 
// 2. Body Parser: Allows Express to read JSON data sent from the frontend.
app.use(express.json());

// --- Static File Serving ---
// Tells Express to look for static assets (like index.html) in the current directory
app.use(express.static(path.join(__dirname)));

// --- Root Route Handler (The Final Fix) ---
// When a user visits the base URL (e.g., /), serve the standard index.html file.
app.get('/', (req, res) => {
    // FINAL FIX: Looking for the standard index.html name.
    const filePath = path.join(__dirname, 'index.html'); 
    
    // Check if the file exists before attempting to send it
    if (!fs.existsSync(filePath)) {
        console.error(`FATAL ERROR: index.html not found at path: ${filePath}. Please ensure your HTML file is named index.html.`);
        // This log will be visible in the Render logs!
        return res.status(500).send("Internal Server Error: Frontend file is missing. Please check the project structure in GitHub.");
    }
    
    res.sendFile(filePath);
});

// --- Configuration for the Analysis Model (Same as before) ---

const systemInstruction = `You are a professional Resume Analyst. Your goal is to review a provided resume text and give constructive feedback to the user.

Your response MUST be formatted strictly using Markdown.
Provide a concise, professional analysis under the following sections, using '##' for headers and '-' for list items.

## 1. Overall Score & Summary
- Provide a brief summary (1-2 sentences).
- Give a score out of 10 for clarity and professionalism.

## 2. Strengths
- List 3-4 specific, positive points (e.g., "Clear use of quantified results," "Relevant skills listed first").

## 3. Areas for Improvement
- List 3-4 specific areas where the resume could be better (e.g., "Bullet points should start with strong action verbs," "Lack of quantified achievements in experience section").
- Suggest one strong action verb for the user to try replacing a weak one with.

## 4. Next Steps & Recommendation
- Offer a final recommendation for what the user should focus on next.`;

// --- API Route (This remains unchanged and handles the AI analysis) ---

app.post('/analyze-resume', async (req, res) => {
    // 1. Input Validation
    const { resumeText } = req.body;
    if (!resumeText) {
        return res.status(400).json({ error: 'Resume text is required for analysis.' });
    }

    try {
        // 2. Call the Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{ 
                parts: [{ text: `Analyze the following resume text based on the instructions provided:\n\n---\n${resumeText}\n---` }] 
            }],
            config: {
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            }
        });

        // 3. Send the formatted Markdown analysis back to the client
        const analysis = response.candidates[0].content.parts[0].text;
        res.json({ analysis });

    } catch (error) {
        console.error('Gemini API Error:', error);
        // Send a generic error message to the client
        res.status(500).json({ error: 'Failed to perform AI analysis. Check server logs for details.' });
    }
});

// --- Server Start ---

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
