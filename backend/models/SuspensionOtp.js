const mongoose = require('mongoose');

const SuspensionOtpSchema = new mongoose.Schema({
  deptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  action: { type: String, enum: ['suspend', 'unsuspend'], required: true },
  otp:    { type: String, required: true },
}, { timestamps: true });

// One active OTP per dept+action at a time
SuspensionOtpSchema.index({ deptId: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('SuspensionOtp', SuspensionOtpSchema);
