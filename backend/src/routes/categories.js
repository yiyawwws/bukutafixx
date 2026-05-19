const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// ─── GET /api/categories (public) ────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(b.id) as book_count FROM categories c
       LEFT JOIN books b ON b.category_id = c.id AND b.is_available = TRUE AND b.is_approved = TRUE
       GROUP BY c.id ORDER BY c.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/categories (admin) ────────────────────────
router.post('/', verifyToken, requireRole('admin'),
  [body('name').trim().notEmpty().withMessage('Nama kategori wajib diisi')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { name } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
      const [result] = await pool.query('INSERT INTO categories (name, slug) VALUES (?,?)', [name, slug]);
      res.status(201).json({ success: true, message: 'Kategori ditambahkan', data: { id: result.insertId, name, slug } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Kategori sudah ada' });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── PUT /api/categories/:id (admin) ─────────────────────
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  try {
    await pool.query('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, req.params.id]);
    res.json({ success: true, message: 'Kategori diupdate' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/categories/:id (admin) ──────────────────
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kategori dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
