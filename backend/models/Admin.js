const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email:    { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name:     String,
  role:     { type: String, enum: ['superadmin', 'admin'], default: 'admin' },

  // 2FA fields
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String,  default: null },
  recoveryCodes:    [{
    code: String,  // bcrypt-hashed
    used: { type: Boolean, default: false },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
