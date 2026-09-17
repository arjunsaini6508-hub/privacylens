const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Shared Global State
let globalState = {
    lastAnalysis: null,
    settings: {
        detectPII: true,
        autoRedact: false,
        trackNetwork: true
    }
};

let clients = [];

function broadcast() {
    clients.forEach(c => c.write(`data: ${JSON.stringify(globalState)}\n\n`));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// SSE Endpoint for real-time dashboard updates
app.get('/api/dashboard/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    clients.push(res);
    
    // Send initial state immediately
    res.write(`data: ${JSON.stringify(globalState)}\n\n`);
    
    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

// REST Endpoint to fetch full state instantly (used by extension popup on open)
app.get('/api/dashboard/data', (req, res) => {
    res.json(globalState);
});

// API Endpoint to update settings
app.post('/api/settings/update', (req, res) => {
    globalState.settings = { ...globalState.settings, ...req.body };
    console.log('Settings updated:', globalState.settings);
    broadcast();
    res.json({ success: true, message: 'Settings saved.' });
});

// API Endpoint to receive data from extension
app.post('/api/dashboard/update', (req, res) => {
    // The extension posts the full analysis object
    let data = req.body;
    
    // Calculate authoritative privacy score here in the SSOT
    try {
        const PrivacyScoreCalculator = require('../extension/utils/privacy-score.js');
        const scoreResult = PrivacyScoreCalculator.calculate(data);
        data.privacyScore = scoreResult.score;
        data.privacyBreakdown = scoreResult.breakdown;
    } catch (e) {
        console.error("Score calculation failed in SSOT", e);
    }
    
    globalState.lastAnalysis = data;
    
    console.log(`Received analysis update for: ${data.url || 'general'}`);
    broadcast(); // push to dashboard
    
    // Return the authenticated state back to the caller (e.g. popup)
    res.json(data);
});

// Start the server
app.listen(PORT, () => {
    console.log(`PrivacyLens AI Dashboard running at http://localhost:${PORT}`);
});
