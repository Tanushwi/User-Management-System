const { verifyToken } = require('../utils/cryptoAuth');
const User = require('../models/User');
const Log = require('../models/Log');

// auth middleware: accepts either Bearer token or x-api-key (admin)
async function authMiddleware(req, res, next) {
  try {
    // API key check first (admin optional)
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const user = await User.findOne({ apiKey, isDeleted: false });
      if (!user) return res.status(401).json({ message: 'Invalid API key' });
      req.user = { id: user._id.toString(), role: user.role, viaApiKey: true };
      return next();
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: 'Invalid or expired token' });

    const user = await User.findById(payload.id);
    if (!user || user.isDeleted) return res.status(401).json({ message: 'User not found' });

    // attach and log session
    req.user = { id: user._id.toString(), role: user.role };

    next();
  } catch (err) {
    next(err);
  }
}

// simple error handler for app
function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Server error', error: err.message });
}

module.exports = { authMiddleware, errorHandler };
