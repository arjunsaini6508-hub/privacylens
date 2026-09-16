const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Endpoint to receive data from extension (mockup)
app.post('/api/dashboard/update', (req, res) => {
    const { privacyScore, redactedElements, networkRequests } = req.body;
    console.log('Received data from extension:');
    console.log('- Privacy Score:', privacyScore);
    console.log('- Redacted Elements:', redactedElements ? redactedElements.length : 0);
    console.log('- Network Requests:', networkRequests ? networkRequests.length : 0);
    
    // In a real app, we would broadcast this via WebSockets to the frontend, 
    // or store it in a database.
    res.json({ success: true, message: 'Data received successfully.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`PrivacyLens AI Dashboard running at http://localhost:${PORT}`);
});
