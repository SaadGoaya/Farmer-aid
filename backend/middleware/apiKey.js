module.exports = function requireFrontendKey(req, res, next) {
  const expected = process.env.FRONTEND_API_KEY;
  if (!expected) return next(); // no key configured, allow through (server owner should set one)

  const provided = req.get('x-api-key') || req.query.api_key || req.get('authorization');
  if (!provided) return res.status(401).json({ error: 'Missing API key' });
  if (provided !== expected) return res.status(403).json({ error: 'Invalid API key' });
  return next();
};
