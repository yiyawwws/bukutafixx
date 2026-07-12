const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const uploadKtm = require('../middleware/uploadKtm');
const { saveFileToDB } = require('../utils/fileUpload');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// POST /api/auth/verify
router.post('/verify', verifyToken, AuthController.verifyIdentity);

// ─── Helper: generate token ───────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active_role: user.active_role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────
function handleUploadKtm(req, res, next) {
  uploadKtm.fields([{ name: 'ktm_image', maxCount: 1 }, { name: 'selfie_image', maxCount: 1 }])(req, res, (err) => {
    if (err) {
      console.warn('[register] Upload warning (dilanjutkan tanpa foto):', err.message);
      req.files = req.files || {};
    }
    next();
  });
}

router.post(
  '/register',
  handleUploadKtm,
  [
    body('name').trim().notEmpty().withMessage('Nama wajib diisi'),
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('phone').optional().isMobilePhone('id-ID').withMessage('Nomor HP tidak valid'),
    body('nim').trim().notEmpty().withMessage('NIM wajib diisi'),
    body('university').trim().notEmpty().withMessage('Universitas wajib diisi'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, phone, address, nim, university } = req.body;

    try {
      // Check email exists
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
      }

      const hashed = await bcrypt.hash(password, 12); // cost 12 untuk production

      let ktm_url = null;
      let selfie_ktm_url = null;
      if (req.files) {
        if (req.files['ktm_image']) ktm_url = await saveFileToDB(req.files['ktm_image'][0]);
        if (req.files['selfie_image']) selfie_ktm_url = await saveFileToDB(req.files['selfie_image'][0]);
      }

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, phone, address, role, active_role, nim, university, ktm_url, selfie_ktm_url) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [name, email, hashed, phone || null, address || null, 'buyer', 'buyer', nim, university, ktm_url, selfie_ktm_url]
      );

      const [rows] = await pool.query(
        'SELECT id, name, email, avatar, role, active_role, is_verified, nim, university FROM users WHERE id = ?',
        [result.insertId]
      );
      const user = rows[0];
      const token = generateToken(user);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(201).json({ success: true, message: 'Registrasi berhasil', token, user });
    } catch (err) {
      console.error('[register] DB error:', err.message, err.code || '');
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      // Jangan beri tahu apakah email atau password yang salah (anti-enumeration)
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Email atau password salah' });
      }

      const user = rows[0];

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan. Hubungi admin.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Email atau password salah' });
      }

      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.json({ success: true, message: 'Login berhasil', token, user: userWithoutPassword });
    } catch (err) {
      console.error('[login] Error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.json({ success: true, message: 'Logout berhasil' });
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, avatar, role, active_role, is_active, nim, university, ktm_url, selfie_ktm_url, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    if (!rows[0].is_active) return res.status(403).json({ success: false, message: 'Akun dinonaktifkan' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[/me] Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
