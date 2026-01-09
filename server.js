// Simple Express server for development
// This handles the API endpoints for the Dad Circles app

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our API handlers
const { leadsEndpoint } = require('./api/leads.ts');
const { chatEndpoint } = require('./api/chat.ts');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist')); // Serve built React app

// API Routes
app.post('/api/leads', leadsEndpoint);
app.post('/api/chat', chatEndpoint);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dad Circles server running on port ${PORT}`);
  console.log(`Landing page: http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/#/admin`);
});

module.exports = app;