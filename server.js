const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodeFetch = require('node-fetch').default; // Critical: Ensures 'fetch' works in Node.js
const path = require('path');

const app = express();
// Use the port provided by the environment (e.g., Vercel/Render) or default to 3000 locally
const port = process.env.PORT || 3000;

// Configuration
// NOTE: For security, the API key is now pulled from environment variables.
const API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
const MAX_RETRIES = 3;

if (!API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}

// Middleware setup
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, ''))); // Serve static files (like your index.html)

/**
 * System Prompt for the AI model, enforcing job-focused, actionable feedback.
 */
const systemPrompt = `Act as a world-class career coach and Applicant Tracking System (ATS) specialist. Your sole goal is to identify specific weaknesses in the provided resume and deliver highly actionable recommendations focused on increasing interview invitations and job opportunities. 
Your response MUST be formatted clearly in Markdown and strictly adhere to the following structure:

1. The very first line of your response MUST be a single score and justification, formatted exactly as: **Resume Score: [Score]/100**. Example: **Resume Score: 85/100** - Strong foundation but lacks metric diversity.

2. Immediately follow with the two mandatory sections below.

## Lacking Areas (Why You Aren't Getting Interviews)
Detail 3-5 specific, high-priority issues that an ATS or recruiter would immediately flag. Use clear, direct language (e.g., "Missing quantifiable results in experience," "Skills section is too general," "Summary is not tailored to a specific role").

## Actionable Improvements (Your Path to More Job Opportunities)
Provide 3-5 concrete, step-by-step instructions. Each instruction must start with a powerful verb and focus on fixing the issues listed in the "Lacking Areas" section. (e.g., "Quantify every bullet point with numbers, percentages, or dollar signs," "Replace the vague Summary with a targeted Career Objective," etc.).

Keep the entire response professional, detailed, and ready for the user to implement immediately.`;

// --- ROUTE HANDLERS ---

// 1. Root Route Handler: Serves the HTML file when the user visits the base URL (e.g., http://localhost:3000/)
app.get('/', (req, res) => {
    // We assume the frontend file is named index.html in the same directory
    res.sendFile(path.join(__dirname, 'index.html')); 
});

// 2. Main API Endpoint: Analyzes the resume using the Gemini API
app.post('/analyze-resume', async (req, res) => {
    const { resumeText } = req.body;

    if (!resumeText) {
        return res.status(400).json({ error: 'Resume text is required for analysis.' });
    }

    // Construct the payload for the Gemini API call
    const payload = {
        contents: [{ 
            parts: [{ 
                text: `Analyze the following resume text based on the system instructions:\n\n---\n\n${resumeText}`
            }] 
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    let analysisResult = null;
    let errorDetails = 'Unknown analysis failure.';

    // Implementation of Retry Loop with Exponential Backoff
    for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
        try {
            const response = await nodeFetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                analysisResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (analysisResult) {
                    return res.json({ analysis: analysisResult });
                } else {
                    errorDetails = data.candidates?.[0]?.finishReason || 'Model returned no text content.';
                    throw new Error(errorDetails); // Force retry if content is missing
                }
            } else {
                errorDetails = data.error?.message || `HTTP Error ${response.status}`;
                throw new Error(errorDetails); // Force retry on HTTP errors
            }

        } catch (error) {
            errorDetails = error.message;

            if (attempts === MAX_RETRIES - 1) {
                // Final attempt failed, send error back to client
                break; 
            }

            // Exponential backoff calculation: 2^attempt * 1000 milliseconds
            const delay = Math.pow(2, attempts + 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // If the loop finishes without returning, send the final error status
    res.status(500).json({ error: `Analysis failed after ${MAX_RETRIES} attempts: ${errorDetails}` });
});

// --- SERVER STARTUP ---
app.listen(port, () => {
    console.log(`Resume Analyzer backend listening on port ${port}`);
});
