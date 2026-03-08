const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (staging environment)
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Static file server is healthy');
});

// UWD homepage (root) - SaaS platform
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tenant routes - Multi-tenant support
app.get('/tenant/:tenantId', (req, res) => {
  const tenantIndex = path.join(__dirname, 'public', 'tenant', req.params.tenantId, 'index.html');
  if (fs.existsSync(tenantIndex)) {
    res.sendFile(tenantIndex);
  } else {
    res.status(404).send('Tenant not found');
  }
});

// Tenant assets and pages - Support for tenant sub-pages
app.get('/tenant/:tenantId/*', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'tenant', req.params.tenantId, req.params[0]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Fallback for UWD SPA routes (not tenant routes)
app.get('*', (req, res) => {
  // Only fallback for UWD routes, not tenant routes
  if (!req.path.startsWith('/tenant/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Static file server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
