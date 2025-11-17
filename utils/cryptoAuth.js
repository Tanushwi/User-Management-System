// cryptoAuth: password hashing, verify + token sign/verify + token generator
const crypto = require('crypto');

const SECRET = global.AUTH_SECRET || 'demo_secret';
const TOKEN_EXPIRY = global.TOKEN_EXPIRY || 3600;

function genSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  const key = crypto.scryptSync(password, salt, 64);
  return key.toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const hash = hashPassword(password, salt);
  // timingSafeEqual expects Buffers of same length
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

// token: simple JWT-like HMAC
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function signToken(payloadObj) {
  const header = { alg: 'HS256', typ: 'JWT' };
  // include expiry in payload
  const payload = Object.assign({}, payloadObj, { iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + TOKEN_EXPIRY });
  const headerB = base64url(JSON.stringify(header));
  const payloadB = base64url(JSON.stringify(payload));
  const data = `${headerB}.${payloadB}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB, payloadB, sig] = parts;
    const data = `${headerB}.${payloadB}`;
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payloadJson = Buffer.from(payloadB.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function genRandomToken(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}

module.exports = {
  genSalt,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  genRandomToken
};
