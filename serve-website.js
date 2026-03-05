#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Handle root URL
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Try to serve index.html for SPA routing
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (indexError, indexContent) => {
          if (indexError) {
            res.writeHead(404);
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 UrWay Dispatch Website Server`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://localhost:${PORT}`);
  console.log(`\n📄 Available pages:`);
  console.log(`   • Home:               http://localhost:${PORT}/`);
  console.log(`   • ROI Calculator:     http://localhost:${PORT}/roi-calculator.html`);
  console.log(`   • Branding Showcase: http://localhost:${PORT}/branding-showcase.html`);
  console.log(`   • Live Demo:          http://localhost:${PORT}/live-demo.html`);
  console.log(`   • About:              http://localhost:${PORT}/about.html`);
  console.log(`   • Services:           http://localhost:${PORT}/services.html`);
  console.log(`   • For Operators:      http://localhost:${PORT}/for-operators.html`);
  console.log(`   • Pricing:            http://localhost:${PORT}/pricing.html`);
  console.log(`   • Contact:            http://localhost:${PORT}/contact.html`);
  console.log(`\n✨ Press Ctrl+C to stop the server\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
