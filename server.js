// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Required to make external HTTP requests
const path = require('path');

const app = express();
// Load the PORT set by Render (e.g., 10000)
const PORT = process.env.PORT || 3000; 
// *** CRITICAL: Load the API Key from Render's environment variable ***
const API_KEY = process.env.GEMINI_API_KEY; 
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

// --- Middleware Configuration ---

// Allow requests from any origin for flexibility, though specific origin is safer
// For production, consider using a specific domain:
app.use(cors()); 

// Increase body limit to handle large Base64 resume files (up to 50MB)
app.use(bodyParser.json({ limit: '50mb' })); 

// Serve the index.html and any static assets (like CSS/JS) from the root
app.use(express.static(path.join(__dirname, '/')));

// --- API Endpoint: The Secure Proxy ---
app.post('/analyze', async (req, res) => {
    // 1. Check for API Key (The likely cause of 403)
    if (!API_KEY) {
        console.error('SERVER ERROR: GEMINI_API_KEY environment variable is NOT set.');
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
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

        // 3. Handle non-OK responses from Google (including the 403/400 errors)
        if (!response.ok) {
            const errorBody = await response.json();
            console.error(`Gemini API Error Status: ${response.status}`, errorBody);
            
            // Forward the error status and body back to the client
            return res.status(response.status).json(errorBody);
        }

        // 4. Return the successful structured response directly to the frontend
        const result = await response.json();
        res.json(result);

    } catch (error) {
        console.error('Proxy Server Network/Processing Error:', error);
        res.status(500).json({ error: 'An unexpected error occurred in the proxy server or network.' });
    }
});

// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});
