const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },

  role: { type: String, enum: ['student','admin','superadmin'], default: 'student' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // login security
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  // verification & reset tokens (simulated email)
  verificationToken: { type: String, default: null },
  isVerified: { type: Boolean, default: false },

  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },

  // session history (store last 5 login timestamps + ip)
  sessions: [{
    at: Date,
    ip: String
  }],

  // password history (store last 3 hashed entries)
  passwordHistory: [{
    hash: String,
    salt: String,
    changedAt: Date
  }],

  // admin API key (optional)
  apiKey: { type: String, default: null },

  createdAt: { type: Date, default: Date.now }
});

// helper instance methods could be added as needed

module.exports = mongoose.model('User', userSchema);
