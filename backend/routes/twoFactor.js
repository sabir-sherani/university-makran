const express    = require('express');
const router     = express.Router();
const speakeasy  = require('speakeasy');
const QRCode     = require('qrcode');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const rateLimit  = require('express-rate-limit');
const Admin      = require('../models/Admin');
const { verifyAdminToken } = require('../middleware/auth');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');

// ── Rate limiters ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many 2FA attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function issueTempToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: 'admin_2fa_pending' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

function issueFullToken(admin) {
  return jwt.sign(
    { id: admin._id, role: 'admin', email: admin.email, tokenVersion: admin.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyTempToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.role !== 'admin_2fa_pending') throw new Error('Invalid token type.');
  return decoded;
}

async function generateRecoveryCodes() {
  const plain = [];
  for (let i = 0; i < 8; i++) {
    const code = [
      crypto.randomBytes(3).toString('hex').toUpperCase(),
      crypto.randomBytes(3).toString('hex').toUpperCase(),
      crypto.randomBytes(3).toString('hex').toUpperCase(),
    ].join('-');
    plain.push(code);
  }
  const hashed = await Promise.all(plain.map(c => bcrypt.hash(c, 10)));
  return { plain, hashed };
}

// ── Login (replaces the one in adminPortal.js for 2FA-aware flow) ─────────────
// POST /api/2fa/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

    if (admin.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact another admin.' });

    if (isLocked(admin)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(admin)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      await recordFailedAttempt(admin);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(admin);

    if (!admin.twoFactorEnabled) {
      // No 2FA — issue JWT immediately (existing behaviour)
      const token = issueFullToken(admin);
      const adminData = admin.toObject();
      delete adminData.password;
      delete adminData.twoFactorSecret;
      delete adminData.recoveryCodes;
      return res.json({ token, admin: adminData });
    }

    // 2FA enabled — return temp token only
    const tempToken = issueTempToken(admin);
    return res.json({ requires2FA: true, tempToken });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Verify TOTP during login ──────────────────────────────────────────────────
// POST /api/2fa/verify-login
router.post('/verify-login', verifyLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ message: 'Temp token and code are required.' });

    const decoded = verifyTempToken(tempToken);
    const admin   = await Admin.findById(decoded.id);
    if (!admin || !admin.twoFactorEnabled) return res.status(400).json({ message: 'Invalid request.' });

    // Try TOTP first
    const valid = speakeasy.totp.verify({
      secret:   admin.twoFactorSecret,
      encoding: 'base32',
      token:    code.replace(/\s/g, ''),
      window:   1,
    });

    if (valid) {
      const token = issueFullToken(admin);
      const adminData = admin.toObject();
      delete adminData.password;
      delete adminData.twoFactorSecret;
      delete adminData.recoveryCodes;
      return res.json({ token, admin: adminData });
    }

    // Try recovery codes
    const codeClean = code.replace(/\s/g, '').toUpperCase();
    let usedRecovery = false;
    for (let i = 0; i < admin.recoveryCodes.length; i++) {
      const rc = admin.recoveryCodes[i];
      if (rc.used) continue;
      const match = await bcrypt.compare(codeClean, rc.code);
      if (match) {
        admin.recoveryCodes[i].used = true;
        await admin.save();
        usedRecovery = true;
        break;
      }
    }

    if (usedRecovery) {
      const token = issueFullToken(admin);
      const adminData = admin.toObject();
      delete adminData.password;
      delete adminData.twoFactorSecret;
      delete adminData.recoveryCodes;
      return res.json({ token, admin: adminData, usedRecoveryCode: true });
    }

    return res.status(400).json({ message: 'Invalid authentication code.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    res.sendServerError(err);
  }
});

// ── Setup: generate secret + QR code ─────────────────────────────────────────
// POST /api/2fa/setup
router.post('/setup', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    if (admin.twoFactorEnabled) return res.status(400).json({ message: '2FA is already enabled.' });

    const secret = speakeasy.generateSecret({
      name:   `UoMP Admin (${admin.email})`,
      issuer: 'University of Makran',
      length: 20,
    });

    // Temporarily store the secret (not enabled until verified)
    admin.twoFactorSecret = secret.base32;
    await admin.save();

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCode: qrCodeDataUrl, secret: secret.base32 });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Enable: verify first TOTP code to confirm setup ──────────────────────────
// POST /api/2fa/enable
router.post('/enable', verifyAdminToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Authenticator code is required.' });

    const admin = await Admin.findById(req.user.id);
    if (!admin || !admin.twoFactorSecret) return res.status(400).json({ message: 'Please start setup first.' });
    if (admin.twoFactorEnabled) return res.status(400).json({ message: '2FA is already enabled.' });

    const valid = speakeasy.totp.verify({
      secret:   admin.twoFactorSecret,
      encoding: 'base32',
      token:    code.replace(/\s/g, ''),
      window:   1,
    });
    if (!valid) return res.status(400).json({ message: 'Invalid code. Please try again.' });

    const { plain, hashed } = await generateRecoveryCodes();
    admin.twoFactorEnabled = true;
    admin.recoveryCodes    = hashed.map(h => ({ code: h, used: false }));
    await admin.save();

    res.json({ message: '2FA enabled successfully.', recoveryCodes: plain });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Disable: verify password before disabling ────────────────────────────────
// POST /api/2fa/disable
router.post('/disable', verifyAdminToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required.' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    if (!admin.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled.' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Incorrect password.' });

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret  = null;
    admin.recoveryCodes    = [];
    await admin.save();

    res.json({ message: '2FA has been disabled.' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Status: get 2FA status + recovery code usage ─────────────────────────────
// GET /api/2fa/status
router.get('/status', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    const totalCodes = admin.recoveryCodes.length;
    const usedCodes  = admin.recoveryCodes.filter(c => c.used).length;
    res.json({
      twoFactorEnabled: admin.twoFactorEnabled,
      totalRecoveryCodes:     totalCodes,
      remainingRecoveryCodes: totalCodes - usedCodes,
    });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Regenerate recovery codes ─────────────────────────────────────────────────
// POST /api/2fa/regenerate-recovery-codes
router.post('/regenerate-recovery-codes', verifyAdminToken, async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    if (!admin.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled.' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Incorrect password.' });

    const { plain, hashed } = await generateRecoveryCodes();
    admin.recoveryCodes = hashed.map(h => ({ code: h, used: false }));
    await admin.save();

    res.json({ message: 'Recovery codes regenerated.', recoveryCodes: plain });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = { router, loginLimiter };
