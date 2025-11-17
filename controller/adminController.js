const User = require('../model/user');
const Log = require('../model/log');
const { genRandomToken } = require('../utils/cryptoAuth');
const fs = require('fs');
const os = require('os');
const path = require('path');

// helper: log action
async function addLog(userId, action, meta = {}, ip = null) {
  try {
    await Log.create({ userId, action, meta, ip });
  } catch (err) {
    console.error('Log err', err);
  }
}

// list users (pagination & search & filter & sort)
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const q = (req.query.query || '').trim();
    const role = req.query.role;
    const sort = req.query.sort || 'createdAt'; // e.g., name or -createdAt

    const filter = {};
    if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
    if (role) filter.role = role;

    const users = await User.find(filter).skip((page - 1) * limit).limit(limit).select('-passwordHash -passwordSalt -resetToken -resetTokenExpiry -verificationToken -passwordHistory');
    const total = await User.countDocuments(filter);
    res.json({ page, limit, total, users });
  } catch (err) {
    next(err);
  }
};

// soft delete
exports.softDelete = async (req, res, next) => {
  try {
    const id = req.params.id;
    await User.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
    await addLog(req.user.id, 'admin.softDelete', { target: id }, req.ip);
    res.json({ message: 'User soft-deleted' });
  } catch (err) {
    next(err);
  }
};

// restore
exports.restore = async (req, res, next) => {
  try {
    const id = req.params.id;
    await User.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null });
    await addLog(req.user.id, 'admin.restore', { target: id }, req.ip);
    res.json({ message: 'User restored' });
  } catch (err) {
    next(err);
  }
};

// update user (admin can edit name, role, generate apiKey)
exports.updateUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.role && ['student','admin','superadmin'].includes(req.body.role)) updates.role = req.body.role;
    if (req.body.generateApiKey === 'true' || req.body.generateApiKey === true) {
      updates.apiKey = genRandomToken(16);
    }
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash -passwordSalt -passwordHistory');
    await addLog(req.user.id, 'admin.updateUser', { target: id, updates }, req.ip);
    res.json({ message: 'User updated', user });
  } catch (err) {
    next(err);
  }
};

// export CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const users = await User.find({}).select('name email role isDeleted createdAt').lean();
    const header = ['name','email','role','isDeleted','createdAt'];
    const tmpPath = path.join(os.tmpdir(), `users-${Date.now()}.csv`);
    const stream = fs.createWriteStream(tmpPath);
    stream.write(header.join(',') + '\n');
    users.forEach(u => {
      const row = [
        `"${(u.name||'').replace(/"/g,'""')}"`,
        `"${(u.email||'').replace(/"/g,'""')}"`,
        u.role || '',
        u.isDeleted ? 'true' : 'false',
        u.createdAt ? u.createdAt.toISOString() : ''
      ];
      stream.write(row.join(',') + '\n');
    });
    stream.end();
    stream.on('finish', () => {
      res.download(tmpPath, 'users.csv', err => {
        if (err) console.error('download err', err);
        fs.unlink(tmpPath, () => {});
      });
    });
  } catch (err) {
    next(err);
  }
};

// stats endpoint
exports.stats = async (req, res, next) => {
  try {
    const total = await User.countDocuments({});
    const active = await User.countDocuments({ isDeleted: false });
    const deleted = await User.countDocuments({ isDeleted: true });
    const admins = await User.countDocuments({ role: 'admin' });
    const superadmins = await User.countDocuments({ role: 'superadmin' });

    // new users last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newLast7 = await User.countDocuments({ createdAt: { $gte: since } });

    // login activity count (from logs)
    const loginCount = await Log.countDocuments({ action: 'login' });

    res.json({ total, active, deleted, admins, superadmins, newLast7, loginCount });
  } catch (err) {
    next(err);
  }
};

// hard-delete cleanup: permanently remove users soft deleted > 30 days
exports.hardDeleteCleanup = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDelete = await User.find({ isDeleted: true, deletedAt: { $lte: cutoff } }).select('_id');
    if (!toDelete.length) return;
    const ids = toDelete.map(d => d._id);
    await User.deleteMany({ _id: { $in: ids } });
    await Log.create({ userId: null, action: 'cleanup.hardDelete', meta: { count: ids.length } });
    console.log(`Hard-deleted ${ids.length} users`);
  } catch (err) {
    console.error('Cleanup error', err);
  }
};
