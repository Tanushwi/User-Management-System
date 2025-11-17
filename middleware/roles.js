function permit(...allowed) {
  return (req, res, next) => {
    const role = req.user && req.user.role;
    if (!role || !allowed.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports = { permit };
