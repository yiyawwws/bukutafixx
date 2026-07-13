const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const uploadAvatar = require('../middleware/uploadAvatar');
const uploadDocs = require('../middleware/uploadDocs');
const { saveFileToDB } = require('../utils/fileUpload');

const router = express.Router();

// ─── GET /api/users (admin only) ──────────────────────────
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      where += ' AND role = ?';
      params.push(role);
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, address, avatar, role, active_role, is_active, nim, university, ktm_url, selfie_ktm_url, is_verified, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM users ${where}`, params);

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[GET /users]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────
// Hanya admin atau user sendiri yang bisa lihat detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === targetId;

    if (!isAdmin && !isSelf) {
      // User lain hanya bisa lihat info publik (nama, avatar, role penjual)
      const [rows] = await pool.query(
        'SELECT id, name, avatar, role FROM users WHERE id = ? AND is_active = TRUE',
        [targetId]
      );
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      return res.json({ success: true, data: rows[0] });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, avatar, role, active_role, is_active, nim, university, ktm_url, selfie_ktm_url, is_verified, created_at FROM users WHERE id = ?',
      [targetId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /users/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/users/profile (update own profile) ─────────
router.put('/profile', verifyToken, uploadAvatar.single('avatar'),
  [
    body('name').optional().trim().notEmpty().withMessage('Nama tidak boleh kosong'),
    body('phone').optional().isMobilePhone('id-ID').withMessage('Nomor HP tidak valid'),
    body('address').optional(),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Error validasi (file memory otomatis di-garbage-collect)
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, phone, address, currentPassword, newPassword } = req.body;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

      const updates = [];
      const params = [];

      if (name) { updates.push('name = ?'); params.push(name); }
      if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
      if (address !== undefined) { updates.push('address = ?'); params.push(address || null); }

      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ success: false, message: 'Password lama wajib diisi' });
        const match = await bcrypt.compare(currentPassword, rows[0].password);
        if (!match) return res.status(401).json({ success: false, message: 'Password lama salah' });
        const hashed = await bcrypt.hash(newPassword, 12);
        updates.push('password = ?'); params.push(hashed);
      }

      if (req.file) {
        const fileUrl = await saveFileToDB(req.file);
        if (fileUrl) {
          updates.push('avatar = ?');
          params.push(fileUrl);
        }
      }

      if (updates.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate' });

      params.push(req.user.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      const [updated] = await pool.query(
        'SELECT id, name, email, phone, address, avatar, role, active_role, is_verified FROM users WHERE id = ?',
        [req.user.id]
      );

      res.json({ success: true, message: 'Profil berhasil diupdate', data: updated[0] });
    } catch (err) {
      console.error('[PUT /users/profile]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── POST /api/users/upload-ktm ───────────────────────────
router.post('/upload-ktm', verifyToken, uploadDocs.fields([
  { name: 'ktm_image', maxCount: 1 },
  { name: 'selfie_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { nim, university } = req.body;
    
    if (!nim || !university) {
      return res.status(400).json({ success: false, message: 'NIM dan Universitas wajib diisi' });
    }
    
    if (!req.files || !req.files.ktm_image || !req.files.selfie_image) {
      return res.status(400).json({ success: false, message: 'Foto KTM dan Selfie KTM wajib diunggah' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const ktmUrl = await saveFileToDB(req.files.ktm_image[0]);
    const selfieUrl = await saveFileToDB(req.files.selfie_image[0]);

    if (!ktmUrl || !selfieUrl) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan file' });
    }

    await pool.query(
      `UPDATE users SET nim = ?, university = ?, ktm_url = ?, selfie_ktm_url = ?, is_verified = FALSE WHERE id = ?`,
      [nim, university, ktmUrl, selfieUrl, req.user.id]
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, phone, address, avatar, role, active_role, nim, university, ktm_url, selfie_ktm_url, is_verified FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, message: 'Dokumen KTM berhasil diunggah. Menunggu verifikasi admin.', data: updated[0] });
  } catch (err) {
    console.error('[POST /users/upload-ktm]', err.message);
    res.status(500).json({ success: false, message: 'Server error saat upload KTM' });
  }
});

// ─── PUT /api/users/switch-role ───────────────────────────
router.put('/switch-role', verifyToken, async (req, res) => {
  const jwt = require('jsonwebtoken');
  try {
    const { active_role } = req.body;
    if (!['seller', 'buyer'].includes(active_role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const user = rows[0];

    // Tidak bisa switch ke seller jika belum punya role seller
    if (active_role === 'seller' && user.role === 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Anda belum memiliki role seller. Hubungi admin untuk upgrade akun.'
      });
    }

    await pool.query('UPDATE users SET active_role = ? WHERE id = ?', [active_role, req.user.id]);

    const newToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, active_role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, phone, address, avatar, role, active_role, is_active, nim, university, ktm_url, selfie_ktm_url, is_verified FROM users WHERE id = ?',
      [req.user.id]
    );

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: `Berhasil beralih ke mode ${active_role}`,
      active_role,
      role: user.role,
      token: newToken,
      user: updated[0],
    });
  } catch (err) {
    console.error('[PUT /users/switch-role]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/users/:id/ban (admin only) ──────────────────
router.put('/:id/ban', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa ban akun sendiri' });
    }

    const [rows] = await pool.query('SELECT id, is_active, role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    if (rows[0].role === 'admin') return res.status(403).json({ success: false, message: 'Tidak bisa ban admin lain' });

    const newStatus = !rows[0].is_active;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, targetId]);
    res.json({
      success: true,
      message: newStatus ? 'Akun berhasil diaktifkan' : 'Akun berhasil dinonaktifkan',
      is_active: newStatus
    });
  } catch (err) {
    console.error('[PUT /users/:id/ban]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/users/:id/verify (admin only) ───────────────
router.put('/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, is_verified, role FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const newStatus = !rows[0].is_verified;
    
    // Jika diverifikasi, upgrade role ke seller jika masih buyer
    if (newStatus && rows[0].role === 'buyer') {
      await pool.query('UPDATE users SET is_verified = ?, role = ?, active_role = ? WHERE id = ?', [newStatus, 'seller', 'buyer', req.params.id]);
      await pool.query('INSERT IGNORE INTO seller_wallets (seller_id) VALUES (?)', [req.params.id]);
    } else {
      await pool.query('UPDATE users SET is_verified = ? WHERE id = ?', [newStatus, req.params.id]);
    }

    res.json({
      success: true,
      message: newStatus ? 'KTM berhasil diverifikasi. User sekarang bisa menjadi seller.' : 'Verifikasi KTM dibatalkan',
      is_verified: newStatus
    });
  } catch (err) {
    console.error('[PUT /users/:id/verify]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/users/:id (admin only) ───────────────────
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' });
    }

    const [targetUser] = await pool.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (targetUser.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    if (targetUser[0].role === 'admin') return res.status(403).json({ success: false, message: 'Tidak bisa menghapus admin lain' });

    await connection.beginTransaction();

    await connection.query('DELETE FROM order_items WHERE seller_id = ?', [targetId]);
    await connection.query('DELETE FROM escrow_transactions WHERE seller_id = ? OR buyer_id = ?', [targetId, targetId]);
    await connection.query('DELETE FROM seller_wallets WHERE seller_id = ?', [targetId]);
    await connection.query('DELETE FROM disputes WHERE buyer_id = ? OR seller_id = ?', [targetId, targetId]);
    await connection.query('UPDATE disputes SET resolved_by = NULL WHERE resolved_by = ?', [targetId]);
    await connection.query('DELETE FROM messages WHERE sender_id = ?', [targetId]);
    await connection.query('DELETE FROM chats WHERE buyer_id = ? OR seller_id = ?', [targetId, targetId]);
    await connection.query('DELETE FROM reviews WHERE buyer_id = ?', [targetId]);
    await connection.query('DELETE FROM users WHERE id = ?', [targetId]);

    await connection.commit();
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    await connection.rollback();
    console.error('[DELETE /users/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
