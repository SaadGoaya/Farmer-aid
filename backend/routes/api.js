const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const rateLimiter = require('../middleware/rateLimiter');
const requireFrontendKey = require('../middleware/apiKey');

// GET /api/geocode?name=city
router.get('/geocode', apiController.geocode);

// GET /api/weather?latitude=...&longitude=...
router.get('/weather', apiController.weather);

// For clarity: reject accidental GETs to /api/gemini with a helpful message
router.get('/gemini', (req, res) => {
	res.status(405).json({ error: 'Method Not Allowed', message: 'Use POST /api/gemini with a JSON body (e.g., { prompt: "..." })' });
});

// POST /api/gemini  { prompt: '...', generationConfig: {...} }
// Protect Gemini with optional API key and rate limiting
router.post('/gemini', requireFrontendKey, rateLimiter, apiController.gemini);

module.exports = router;
