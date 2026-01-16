// Simple Express server for development
// This handles the API endpoints for the Dad Circles app

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from functions/.env
dotenv.config({ path: './functions/.env' });

console.log('🔑 Environment variables loaded');
console.log('📧 RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our API handlers
// import { leadsEndpoint } from './api/leads.ts';
// import { chatEndpoint } from './api/chat.ts';
import { setupMatchingRoutes } from './api/matching.js';

const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 so Vite can use 3000

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist')); // Serve built React app

// API Routes
// app.post('/api/leads', leadsEndpoint);
// app.post('/api/chat', chatEndpoint);

// Setup matching routes
setupMatchingRoutes(app);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dad Circles server running on port ${PORT}`);
  console.log(`Landing page: http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/#/admin`);
  console.log(`Matching API: http://localhost:${PORT}/api/matching/*`);
});

export default app;