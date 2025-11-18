// route-level limiter: export function to create middleware with limit/window
const stores = new Map(); // key -> {count, t}

function limiter(keyPrefix = 'global', limit = 60, windowMs = 60*1000) {
  return (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${ip}`;
      const now = Date.now();
      let entry = stores.get(key);
      if (!entry || now - entry.t > windowMs) {
        entry = { count: 1, t: now };
      } else {
        entry.count += 1;
      }
      stores.set(key, entry);
      if (entry.count > limit) return res.status(429).json({ message: 'Too many requests, slow down' });
      next();
    } catch (err) {
      next(err);
    }
  };
}

// default limiter middleware for general routes (60 req/min)
module.exports = limiter;
