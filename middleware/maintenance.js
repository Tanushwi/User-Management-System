// Blocks requests with MAINTENANCE flag except routes that start with /api/admin and permit superadmin (they can still access admin)
module.exports = (req, res, next) => {
  if (!global.MAINTENANCE) return next();

  // allow admin endpoints (they will still be authenticated/authorized)
  if (req.path.startsWith('/api/admin')) return next();

  // allow static pages for demo? block everything else
  return res.status(503).json({ message: 'Site under maintenance' });
};
