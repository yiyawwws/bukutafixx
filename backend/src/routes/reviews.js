const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/books/:book_id/reviews ─────────────────────
router.get('/:book_id/reviews', async (req, res) => {
  const bookId = parseInt(req.params.book_id);
  if (isNaN(bookId)) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
       u.id as reviewer_id, u.name as reviewer_name, u.avatar as reviewer_avatar
       FROM reviews r
       JOIN users u ON r.buyer_id = u.id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC`,
      [bookId]
    );

    const totalRating = rows.reduce((sum, r) => sum + r.rating, 0);
    const avg_rating = rows.length ? (totalRating / rows.length).toFixed(1) : '0.0';

    // Distribusi bintang
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    rows.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });

    res.json({
      success: true,
      data: rows,
      avg_rating: parseFloat(avg_rating),
      total: rows.length,
      distribution,
    });
  } catch (err) {
    console.error('[GET /books/:book_id/reviews]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/books/:book_id/my-review ───────────────────
// Cek apakah user sudah pernah review buku ini
router.get('/:book_id/my-review', verifyToken, async (req, res) => {
  const bookId = parseInt(req.params.book_id);
  if (isNaN(bookId)) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM reviews WHERE book_id = ? AND buyer_id = ?',
      [bookId, req.user.id]
    );

    // Cek apakah user pernah beli dan sudah delivered
    const [purchased] = await pool.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.buyer_id = ? AND oi.book_id = ? AND o.delivery_status = 'delivered'`,
      [req.user.id, bookId]
    );

    res.json({
      success: true,
      can_review: purchased.length > 0,
      has_reviewed: rows.length > 0,
      review: rows.length > 0 ? rows[0] : null,
    });
  } catch (err) {
    console.error('[GET /books/:book_id/my-review]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/books/:book_id/reviews ────────────────────
router.post('/:book_id/reviews', verifyToken,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating harus antara 1-5'),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Komentar maksimal 1000 karakter'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const bookId = parseInt(req.params.book_id);
    if (isNaN(bookId)) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Validasi: buku harus ada
      const [[book]] = await conn.query('SELECT id, seller_id FROM books WHERE id = ?', [bookId]);
      if (!book) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
      }

      // Penjual tidak bisa review bukunya sendiri
      if (book.seller_id === req.user.id) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Penjual tidak bisa memberikan ulasan untuk bukunya sendiri' });
      }

      // Harus sudah beli dan terima buku
      const [purchased] = await conn.query(
        `SELECT oi.id FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.buyer_id = ? AND oi.book_id = ? AND o.delivery_status = 'delivered'`,
        [req.user.id, bookId]
      );
      if (purchased.length === 0) {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          message: 'Anda hanya bisa memberi ulasan setelah mengkonfirmasi penerimaan buku'
        });
      }

      const { rating, comment } = req.body;
      await conn.query(
        `INSERT INTO reviews (book_id, buyer_id, rating, comment)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = NOW()`,
        [bookId, req.user.id, rating, comment || null]
      );

      // Update avg_rating di tabel books (denormalisasi untuk performa query)
      const [[avgRow]] = await conn.query(
        'SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as cnt FROM reviews WHERE book_id = ?',
        [bookId]
      );
      // Simpan avg ke kolom jika kolom ada (tidak wajib, query saat GET sudah hitung dinamis)

      await conn.commit();

      res.status(201).json({
        success: true,
        message: 'Ulasan berhasil ditambahkan',
        data: { book_id: bookId, rating, comment: comment || null }
      });
    } catch (err) {
      await conn.rollback();
      console.error('[POST /books/:book_id/reviews]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      conn.release();
    }
  }
);

// ─── DELETE /api/books/:book_id/reviews ──────────────────
// Hanya user yang memberi review atau admin yang bisa hapus
router.delete('/:book_id/reviews', verifyToken, async (req, res) => {
  const bookId = parseInt(req.params.book_id);
  if (isNaN(bookId)) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

  try {
    if (req.user.role === 'admin') {
      await pool.query('DELETE FROM reviews WHERE book_id = ?', [bookId]);
    } else {
      await pool.query('DELETE FROM reviews WHERE book_id = ? AND buyer_id = ?', [bookId, req.user.id]);
    }
    res.json({ success: true, message: 'Ulasan berhasil dihapus' });
  } catch (err) {
    console.error('[DELETE /books/:book_id/reviews]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
