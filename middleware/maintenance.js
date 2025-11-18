module.exports = (req, res, next) => {
  if (!global.MAINTENANCE) return next();

  if (req.path.startsWith('/api/admin')) return next();

  return res.status(503).json({ message: 'Site under maintenance' });
};
