const User = require('../model/user');
const Log = require('../model/log');
const { genSalt, hashPassword, verifyPassword, signToken, genRandomToken } = require('../utils/cryptoAuth');

const LOGIN_ATTEMPT_LIMIT = 5; // lock after 5 wrong tries
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_HISTORY_LIMIT = 3;

// helper to add log
async function addLog(userId, action, meta = {}, ip = null) {
  try {
    await Log.create({ userId, action, meta, ip });
  } catch (err) {
    console.error('Log err', err);
  }
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'name,email,password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email exists' });

    const salt = genSalt();
    const hash = hashPassword(password, salt);

    // verification token (simulate email)
    const verificationToken = genRandomToken(16);

    const user = await User.create({
      name, email, passwordHash: hash, passwordSalt: salt,
      verificationToken,
      passwordHistory: [{ hash, salt, changedAt: new Date() }]
    });

    // log
    await addLog(user._id, 'register', { email }, req.ip);

    // return verification token in response (simulate sending email)
    res.status(201).json({ message: 'Registered. Verify using token', verificationToken });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body || {};
    if (!email || !token) return res.status(400).json({ message: 'email & token required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid' });
    if (user.isVerified) return res.json({ message: 'Already verified' });
    if (user.verificationToken !== token) return res.status(400).json({ message: 'Invalid token' });

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    await addLog(user._id, 'verifyEmail', {}, req.ip);
    res.json({ message: 'Email verified' });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email & password required' });

    const user = await User.findOne({ email });
    if (!user || user.isDeleted) return res.status(400).json({ message: 'Invalid credentials' });

    // check lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ message: 'Account locked. Try later' });
    }

    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= LOGIN_ATTEMPT_LIMIT) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.loginAttempts = 0; // reset attempts after locking
      }
      await user.save();
      await addLog(user._id, 'failedLogin', {}, req.ip);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // success -> reset attempts
    user.loginAttempts = 0;
    user.lockUntil = null;

    // update sessions (keep last 5)
    const sess = { at: new Date(), ip: req.ip || null };
    user.sessions = user.sessions || [];
    user.sessions.unshift(sess);
    if (user.sessions.length > 5) user.sessions.pop();

    await user.save();

    const token = signToken({ id: user._id.toString(), role: user.role });
    await addLog(user._id, 'login', {}, req.ip);

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (err) {
    next(err);
  }
};

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = genRandomToken(16);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    await addLog(user._id, 'requestPasswordReset', {}, req.ip);

    // return token in response (simulate email)
    res.json({ message: 'Reset token generated', resetToken: token });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) return res.status(400).json({ message: 'email,token,newPassword required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid' });

    if (!user.resetToken || user.resetToken !== token) return res.status(400).json({ message: 'Invalid token' });
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return res.status(400).json({ message: 'Token expired' });

    // check password history (prevent reuse)
    const salt = genSalt();
    const newHash = hashPassword(newPassword, salt);
    const used = (user.passwordHistory || []).some(ph => ph.hash === newHash);
    if (used) return res.status(400).json({ message: 'Cannot reuse recent password' });

    // update password & push to history (keep last 3)
    user.passwordSalt = salt;
    user.passwordHash = newHash;
    user.passwordHistory = user.passwordHistory || [];
    user.passwordHistory.unshift({ hash: newHash, salt, changedAt: new Date() });
    if (user.passwordHistory.length > PASSWORD_HISTORY_LIMIT) user.passwordHistory.pop();

    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    await addLog(user._id, 'resetPassword', {}, req.ip);
    res.json({ message: 'Password reset' });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -passwordSalt -resetToken -resetTokenExpiry -verificationToken -passwordHistory');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, password } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (password) {
      // prevent reuse
      const salt = genSalt();
      const newHash = hashPassword(password, salt);
      const used = (user.passwordHistory || []).some(ph => ph.hash === newHash);
      if (used) return res.status(400).json({ message: 'Cannot reuse recent password' });

      user.passwordSalt = salt;
      user.passwordHash = newHash;
      user.passwordHistory = user.passwordHistory || [];
      user.passwordHistory.unshift({ hash: newHash, salt, changedAt: new Date() });
      if (user.passwordHistory.length > PASSWORD_HISTORY_LIMIT) user.passwordHistory.pop();
    }

    await user.save();
    await addLog(user._id, 'updateProfile', {}, req.ip);

    res.json({ message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
};
