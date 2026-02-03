// Load .env from this backend folder when present (local dev). In Vercel, set env vars in the dashboard.
const fs = require('fs');
const path = require('path');
const dotenvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Health check and API routes (require after env is loaded)
const healthRouter = require('./routes/health');
const apiRouter = require('./routes/api');

// Lightweight logger for API requests to help debug 404s (no secrets)
app.use('/api', (req, res, next) => {
  try {
    console.log(`[API] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  } catch (e) {
    // ignore logging errors
  }
  next();
});

app.use('/api', healthRouter);
app.use('/api', apiRouter);

// Diagnostic endpoint: list mounted API routes (helps debug 404s)
app.get('/api/_routes', (req, res) => {
  try {
    const routes = [];
    if (app && app._router && Array.isArray(app._router.stack)) {
      app._router.stack.forEach((layer) => {
        try {
          if (layer && layer.route && layer.route.path) {
            routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods || {}) });
          } else if (layer && layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
            layer.handle.stack.forEach((l) => {
              if (l && l.route && l.route.path) {
                routes.push({ path: `/api${l.route.path}`, methods: Object.keys(l.route.methods || {}) });
              }
            });
          }
        } catch (inner) {
          // skip problematic layer
        }
      });
    }
    return res.json({ routes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list routes' });
  }
});

// Basic error handlers for clearer terminal output
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY is not set. Gemini proxy will return errors until configured.');
    }
  });
} else {
  // When required as a module (e.g. by Vercel's serverless runtime), export the app
  module.exports = app;
}
