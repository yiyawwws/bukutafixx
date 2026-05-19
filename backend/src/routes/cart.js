const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/cart ────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.stock, b.condition,
       b.is_available, b.seller_id, u.name as seller_name,
       COALESCE(
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
         b.cover_image
       ) as cover_url
       FROM cart_items ci
       JOIN books b ON ci.book_id = b.id
       JOIN users u ON b.seller_id = u.id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [req.user.id]
    );
    const total = rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    res.json({ success: true, data: rows, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    console.error('[GET /cart]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/cart ───────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const book_id = parseInt(req.body.book_id);
  const quantity = parseInt(req.body.quantity) || 1;

  if (isNaN(book_id) || book_id <= 0) {
    return res.status(400).json({ success: false, message: 'book_id tidak valid' });
  }
  if (quantity < 1 || quantity > 100) {
    return res.status(400).json({ success: false, message: 'Jumlah harus antara 1-100' });
  }

  try {
    const [books] = await pool.query(
      'SELECT * FROM books WHERE id = ? AND is_available = TRUE AND is_approved = TRUE',
      [book_id]
    );
    if (books.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak tersedia atau belum disetujui' });

    const book = books[0];

    // Tidak bisa membeli buku sendiri
    if (book.seller_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menambahkan buku milik sendiri ke keranjang' });
    }

    if (quantity > book.stock) {
      return res.status(400).json({ success: false, message: `Stok tidak cukup (tersedia: ${book.stock})` });
    }

    // Upsert — jika sudah ada, update quantity (tidak melebihi stok)
    await pool.query(
      `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + ?, ?)`,
      [req.user.id, book_id, quantity, quantity, book.stock]
    );

    res.status(201).json({ success: true, message: 'Buku ditambahkan ke keranjang' });
  } catch (err) {
    console.error('[POST /cart]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/cart/:id ────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: 'Quantity tidak valid' });

  try {
    const [rows] = await pool.query('SELECT ci.*, b.stock FROM cart_items ci JOIN books b ON ci.book_id = b.id WHERE ci.id = ? AND ci.user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Item tidak ditemukan' });

    if (quantity > rows[0].stock) {
      return res.status(400).json({ success: false, message: `Stok tidak cukup (tersedia: ${rows[0].stock})` });
    }

    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, req.user.id]);
    res.json({ success: true, message: 'Keranjang diupdate' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/cart/:id ─────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Item dihapus dari keranjang' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/cart (clear all) ────────────────────────
router.delete('/', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Keranjang dikosongkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
