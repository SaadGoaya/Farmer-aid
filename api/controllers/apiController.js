const axios = require('axios');

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

// Use GEMINI_API_URL and GEMINI_API_KEY from process.env (loaded via dotenv in server.js)
// Default to the official Google Generative Language endpoint for Gemini
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

exports.geocode = async (req, res) => {
  try {
    const { name, count = 1, language = 'en', countrycodes } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing `name` query parameter' });

    const params = { name, count, language };
    if (countrycodes) params.countrycodes = countrycodes;

    const response = await axios.get(GEOCODE_URL, { params });
    return res.json(response.data);
  } catch (err) {
    console.error('Geocode error:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
};

exports.weather = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Missing latitude or longitude' });

    const dailyParams = [
      'temperature_2m_max', 'temperature_2m_min', 'weathercode',
      'relative_humidity_2m_max', 'relative_humidity_2m_min',
      'sunrise', 'sunset', 'precipitation_sum', 'rain_sum'
    ].join(',');

    const hourlyParams = [
      'temperature_2m', 'relative_humidity_2m', 'rain', 'weathercode',
      'soil_temperature_0cm', 'et0_fao_evapotranspiration'
    ].join(',');

    const params = {
      latitude,
      longitude,
      daily: dailyParams,
      hourly: hourlyParams,
      current_weather: true,
      timezone: 'auto',
      forecast_days: 7
    };

    const response = await axios.get(WEATHER_URL, { params });
    return res.json(response.data);
  } catch (err) {
    console.error('Weather fetch error:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Weather fetch failed' });
  }
};

exports.gemini = async (req, res) => {
  try {
    // Log incoming request for diagnostics (do not print secrets)
    try {
      const bodyPreview = req.body && (typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 500) : String(req.body).slice(0,500));
      console.log(`[Gemini] ${new Date().toISOString()} ${req.method} ${req.originalUrl} bodyPreview=${bodyPreview}`);
    } catch (e) {
      console.log('[Gemini] incoming request (could not stringify body)');
    }
    // Accept two shapes from frontend:
    // 1) full Gemini request body (contains systemInstruction and contents) -> forward as-is
    // 2) shorthand { prompt, generationConfig } -> wrap into the expected Gemini body
    const incoming = req.body || {};

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server-side Gemini API key not configured' });
    }

    let forwardBody;
    if (incoming.systemInstruction || incoming.contents) {
      forwardBody = incoming; // forward the full request body as-is
    } else if (incoming.prompt) {
      forwardBody = {
        systemInstruction: { parts: [{ text: "You are AgriGuide, a concise agricultural expert." }] },
        contents: [{ parts: [{ text: incoming.prompt }] }],
        generationConfig: incoming.generationConfig || { temperature: 0.2, maxOutputTokens: 1200 }
      };
    } else {
      return res.status(400).json({ error: 'Missing prompt or full request body' });
    }

    // Prepare headers. Prefer Authorization Bearer header for API keys;
    // some providers accept `?key=` but headers are more common and safer.
    const headers = { 'Content-Type': 'application/json' };

    let axiosUrl = GEMINI_API_URL;
    // If the configured URL is a placeholder, provide a helpful error.
    if (!axiosUrl || axiosUrl.includes('your-gemini-endpoint') || axiosUrl.includes('example')) {
      console.error('Gemini proxy misconfigured: GEMINI_API_URL looks like a placeholder:', axiosUrl);
      return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_URL is not set correctly' });
    }

    // Handle common provider patterns:
    // - Google Generative Language: expects POST to a model generate endpoint and allows API key via ?key=API_KEY
    // - Other providers may accept Authorization: Bearer <key>
    try {
      let resp;

      if (GEMINI_API_KEY && axiosUrl.includes('generativelanguage.googleapis.com')) {
        // Google-style API key usage via query param
        const urlWithKey = axiosUrl.includes('?') ? `${axiosUrl}&key=${GEMINI_API_KEY}` : `${axiosUrl}?key=${GEMINI_API_KEY}`;
        resp = await axios.post(urlWithKey, forwardBody, { headers, timeout: 20000 });
      } else {
        if (GEMINI_API_KEY) {
          headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
        }
        resp = await axios.post(axiosUrl, forwardBody, { headers, timeout: 20000 });
      }

      // Normalize response so frontend can reliably read the text at
      // candidates[0].content.parts[0].text (existing frontend expects this shape).
      const upstream = resp.data || {};

      // If provider already returns 'candidates' in expected shape, forward as-is.
      if (upstream.candidates && Array.isArray(upstream.candidates) && upstream.candidates.length > 0) {
        return res.json(upstream);
      }

      // Otherwise, try to extract any text content from common fields.
      const tryExtractText = (obj) => {
        try {
          if (!obj) return null;
          if (typeof obj === 'string') return obj;
          // Common Google-style outputs
          if (obj.output && Array.isArray(obj.output) && obj.output[0]?.content) {
            // output[0].content may be an array of content pieces
            const c = obj.output[0].content;
            if (Array.isArray(c)) {
              for (const item of c) {
                if (item?.text) return item.text;
                if (item?.mimeType === 'text/plain' && item?.text) return item.text;
              }
            } else if (c.text) return c.text;
          }
          if (obj.outputs && Array.isArray(obj.outputs) && obj.outputs[0]?.content) {
            const c = obj.outputs[0].content;
            if (Array.isArray(c) && c[0]?.text) return c[0].text;
          }
          if (obj.generated_text) return obj.generated_text;
          if (obj.text) return obj.text;
          if (obj.choices && Array.isArray(obj.choices) && obj.choices[0]?.text) return obj.choices[0].text;
          // Fallback: stringify a short summary
          const s = JSON.stringify(obj);
          return s.length > 0 ? (s.length > 1000 ? s.slice(0, 1000) : s) : null;
        } catch (e) {
          return null;
        }
      }

      const extracted = tryExtractText(upstream) || '';
      const normalized = { candidates: [{ content: { parts: [{ text: extracted }] } }] };
      return res.json(normalized);
    } catch (err) {
      // Log helpful debug information but avoid printing secrets
      const status = err?.response?.status;
      const upstream = err?.response?.data;
      const upstreamMsg = upstream && (upstream.error || upstream.message || JSON.stringify(upstream).slice(0, 400));
      console.error('Gemini upstream error:', { status, upstreamSummary: upstreamMsg });

      // Helpful automatic check: if model not found for Google GL, attempt to list available models
      if (status === 404 && axios && GEMINI_API_KEY) {
        try {
          const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
          const listResp = await axios.get(`${listUrl}?key=${GEMINI_API_KEY}`, { timeout: 10000 });
          const models = (listResp.data && listResp.data.models) || [];
          const names = models.map(m => m.name).slice(0, 50);
          console.warn('Available models (truncated):', names.slice(0,20));
          return res.status(404).json({ error: 'Model not found', details: upstreamMsg, availableModels: names });
        } catch (listErr) {
          console.error('Failed to list models for diagnostic:', listErr?.response?.data || listErr.message || listErr);
          const clientMessage = (upstream && (upstream.error || upstream.message)) || err.message || 'AI generation failed';
          return res.status(status || 500).json({ error: 'AI generation failed', details: clientMessage });
        }
      }

      const clientMessage = (upstream && (upstream.error || upstream.message)) || err.message || 'AI generation failed';
      return res.status(status || 500).json({ error: 'AI generation failed', details: clientMessage });
    }
  } catch (err) {
    console.error('Gemini proxy error:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'AI generation failed' });
  }
};
