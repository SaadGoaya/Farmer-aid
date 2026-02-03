exports.getHealth = (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
};
