// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // NOTE: Requires 'node-fetch' dependency

const app = express();
// Render automatically sets the PORT environment variable
const PORT = process.env.PORT || 3000; 
// *** SECURELY LOAD THE API KEY from Render's environment variables ***
const API_KEY = process.env.GEMINI_API_KEY; 
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

// --- Middleware Configuration ---

// Use CORS to allow your frontend to communicate with this server
// Set the origin to your live Render URL for production security:
const FRONTEND_URL = 'https://ai-resumeanalyzer-9wl5.onrender.com';
app.use(cors({
    origin: FRONTEND_URL
}));

// Increase body limit to handle large Base64 resume files (e.g., 50MB)
app.use(bodyParser.json({ limit: '50mb' })); 

// --- Static File Serving (To serve index.html) ---
const path = require('path');
// Serve the index.html file from the root directory
app.use(express.static(path.join(__dirname, '/')));

// --- API Endpoint: The Secure Proxy ---
app.post('/analyze', async (req, res) => {
    // 1. Check for API Key
    if (!API_KEY) {
        console.error('API Key is missing from environment variables!');
        return res.status(500).json({ error: 'Server configuration error: API Key is missing.' });
    }
    
    // The frontend sends the entire payload structure needed by the Gemini API
    const frontendPayload = req.body;
    
    try {
        // Construct the Google API URL using the securely loaded API_KEY
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        
        // 2. Call Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(frontendPayload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Forward non-success API response (e.g., 400 Bad Request, 429 Rate Limit)
            console.error('Gemini API Error Response:', result);
            return res.status(response.status).json(result);
        }

        // 3. Return the successful structured response directly to the frontend
        res.json(result);

    } catch (error) {
        console.error('Proxy Server Error:', error);
        res.status(500).json({ error: 'An unexpected error occurred in the proxy server or network.' });
    }
});

// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}. Frontend URL set to ${FRONTEND_URL}`);
});
