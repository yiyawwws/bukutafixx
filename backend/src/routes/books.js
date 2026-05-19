const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { requireRole, requireActiveRole } = require('../middleware/role');
const upload = require('../middleware/upload');

const BookController = require('../controllers/BookController');

const router = express.Router();

// ─── Helper: ambil semua foto buku ────────────────────────
async function getBookImages(bookId) {
  const [images] = await pool.query(
    'SELECT id, url, is_cover, sort_order FROM book_images WHERE book_id = ? ORDER BY is_cover DESC, sort_order ASC',
    [bookId]
  );
  return images;
}

// ─── Helper: sanitize integer param ───────────────────────
function safeInt(val, fallback) {
  const n = parseInt(val);
  return isNaN(n) ? fallback : n;
}

// GET /api/books/list
router.get('/list', BookController.listAvailableBooks);

// ─── GET /api/books (public) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category, condition, min_price, max_price, seller_id, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    // Selalu tampilkan hanya buku yang tersedia dan sudah disetujui (tidak ada bypass publik)
    let where = 'WHERE b.is_available = TRUE AND b.is_approved = TRUE';
    const params = [];

    if (search) {
      where += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      where += ' AND c.slug = ?';
      params.push(category);
    }
    if (condition) {
      const validConditions = ['like_new', 'good', 'fair', 'poor'];
      if (validConditions.includes(condition)) {
        where += ' AND b.condition = ?';
        params.push(condition);
      }
    }
    if (min_price) {
      const minP = parseFloat(min_price);
      if (!isNaN(minP)) { where += ' AND b.price >= ?'; params.push(minP); }
    }
    if (max_price) {
      const maxP = parseFloat(max_price);
      if (!isNaN(maxP)) { where += ' AND b.price <= ?'; params.push(maxP); }
    }
    if (seller_id) {
      const sid = safeInt(seller_id, null);
      if (sid) { where += ' AND b.seller_id = ?'; params.push(sid); }
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.condition, b.description, b.price, b.stock,
       b.is_available, b.is_approved, b.created_at, b.updated_at,
       c.name as category_name, u.name as seller_name,
       ROUND(COALESCE(AVG(r.rating), 0), 1) as avg_rating,
       COUNT(DISTINCT r.id) as review_count,
       COALESCE(
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id ORDER BY bi.sort_order ASC LIMIT 1),
         b.cover_image
       ) as cover_url
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN reviews r ON b.id = r.book_id
       ${where}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeInt(limit, 12), safeInt(offset, 0)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) as total FROM books b LEFT JOIN categories c ON b.category_id = c.id ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: safeInt(page, 1), limit: safeInt(limit, 12) });
  } catch (err) {
    console.error('[GET /books]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/books/admin-list (admin only) ───────────────
// Endpoint terpisah untuk admin melihat semua buku termasuk yang belum approved
router.get('/admin-list', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { search, approved, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (b.title LIKE ? OR b.author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (approved !== undefined) {
      where += ' AND b.is_approved = ?';
      params.push(approved === 'true' || approved === '1');
    }

    const [rows] = await pool.query(
      `SELECT b.*, c.name as category_name, u.name as seller_name,
       ROUND(COALESCE(AVG(r.rating), 0), 1) as avg_rating, COUNT(DISTINCT r.id) as review_count,
       COALESCE(
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
         b.cover_image
       ) as cover_url
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN reviews r ON b.id = r.book_id
       ${where}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeInt(limit, 12), safeInt(offset, 0)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) as total FROM books b LEFT JOIN categories c ON b.category_id = c.id ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: safeInt(page, 1), limit: safeInt(limit, 12) });
  } catch (err) {
    console.error('[GET /books/admin-list]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/books/seller-list (seller only) ───────────────
// Endpoint terpisah untuk seller melihat semua buku miliknya (termasuk yang belum approved/available)
router.get('/seller-list', verifyToken, requireActiveRole('seller'), async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE b.seller_id = ?';
    const params = [req.user.id];

    if (search) {
      where += ' AND (b.title LIKE ? OR b.author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT b.*, c.name as category_name,
       ROUND(COALESCE(AVG(r.rating), 0), 1) as avg_rating, COUNT(DISTINCT r.id) as review_count,
       COALESCE(
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
         b.cover_image
       ) as cover_url
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN reviews r ON b.id = r.book_id
       ${where}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeInt(limit, 12), safeInt(offset, 0)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) as total FROM books b ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: safeInt(page, 1), limit: safeInt(limit, 12) });
  } catch (err) {
    console.error('[GET /books/seller-list]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/books/:id (public) ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const bookId = safeInt(req.params.id, null);
    if (!bookId) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

    const [rows] = await pool.query(
      `SELECT b.*, c.name as category_name,
       u.name as seller_name, u.id as seller_id,
       u.phone as seller_phone, u.avatar as seller_avatar,
       u.university as seller_university,
       ROUND(COALESCE(AVG(r.rating), 0), 1) as avg_rating,
       COUNT(DISTINCT r.id) as review_count
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.id = ?
       GROUP BY b.id`,
      [bookId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

    const book = rows[0];
    book.images = await getBookImages(book.id);
    book.cover_url = book.images.find(i => i.is_cover)?.url
      || book.images[0]?.url
      || book.cover_image;

    // Format nomor WA penjual
    if (book.seller_phone) {
      const phone = book.seller_phone.replace(/\D/g, '');
      const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
      book.seller_whatsapp = `https://wa.me/${waPhone}`;
    } else {
      book.seller_whatsapp = null;
    }

    res.json({ success: true, data: book });
  } catch (err) {
    console.error('[GET /books/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/books/:id/seller-contact ───────────────────
// Ambil info kontak penjual untuk tombol "Chat WA"
router.get('/:id/seller-contact', async (req, res) => {
  try {
    const bookId = safeInt(req.params.id, null);
    if (!bookId) return res.status(400).json({ success: false, message: 'ID buku tidak valid' });

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.phone
       FROM books b
       JOIN users u ON b.seller_id = u.id
       WHERE b.id = ? AND b.is_available = TRUE AND b.is_approved = TRUE`,
      [bookId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

    const seller = rows[0];
    let whatsapp_url = null;
    if (seller.phone) {
      const phone = seller.phone.replace(/\D/g, '');
      const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
      whatsapp_url = `https://wa.me/${waPhone}`;
    }

    res.json({
      success: true,
      data: {
        seller_id: seller.id,
        seller_name: seller.name,
        seller_avatar: seller.avatar,
        whatsapp_url, // null jika penjual belum isi nomor HP
        has_whatsapp: !!whatsapp_url,
      }
    });
  } catch (err) {
    console.error('[GET /books/:id/seller-contact]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/books (seller) — upload max 5 foto ────────
const multerErrorHandler = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      console.error('[Upload Error]', err.message);
      return res.status(400).json({ success: false, message: err.message || 'Gagal mengupload foto' });
    }
    next();
  });
};

router.post('/', verifyToken, requireActiveRole('seller'), multerErrorHandler,
  [
    body('title').trim().notEmpty().withMessage('Judul wajib diisi'),
    body('author').trim().notEmpty().withMessage('Penulis wajib diisi'),
    body('price').isFloat({ min: 0 }).withMessage('Harga tidak valid'),
    body('stock').isInt({ min: 1 }).withMessage('Stok minimal 1'),
    body('condition').isIn(['like_new', 'good', 'fair', 'poor']).withMessage('Kondisi tidak valid'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { title, author, isbn, category_id, condition, description, price, stock } = req.body;
    const files = req.files || [];

    const cover_image = files.length > 0 ? files[0].path : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO books (seller_id, category_id, title, author, isbn, `condition`, description, price, stock, cover_image, is_approved) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [req.user.id, category_id || null, title, author, isbn || null, condition, description || null, parseFloat(price), safeInt(stock, 1), cover_image, false]
      );
      const bookId = result.insertId;

      if (files.length > 0) {
        const imageValues = files.map((file, index) => [
          bookId, file.path, index === 0, index
        ]);
        await connection.query(
          'INSERT INTO book_images (book_id, url, is_cover, sort_order) VALUES ?',
          [imageValues]
        );
      }

      await connection.commit();

      const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [bookId]);
      const images = await getBookImages(bookId);

      res.status(201).json({
        success: true,
        message: `Buku berhasil ditambahkan${files.length > 0 ? ` dengan ${files.length} foto` : ''}. Menunggu persetujuan admin.`,
        data: { ...book[0], images }
      });
    } catch (err) {
      await connection.rollback();
      console.error('[POST /books]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

// ─── PUT /api/books/:id (seller/admin) ───────────────────
router.put('/:id', verifyToken, upload.array('images', 5), async (req, res) => {
  const bookId = safeInt(req.params.id, null);
  if (!bookId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

    const book = rows[0];
    if (req.user.role !== 'admin' && book.seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await connection.beginTransaction();

    const allowedFields = ['title', 'author', 'isbn', 'category_id', 'condition', 'description', 'price', 'stock', 'is_available'];
    const adminOnlyFields = ['is_approved'];
    const updates = [];
    const params = [];

    [...allowedFields, ...(req.user.role === 'admin' ? adminOnlyFields : [])].forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`\`${field}\` = ?`);
        params.push(req.body[field]);
      }
    });

    if (req.files && req.files.length > 0) {
      const [[{ cnt }]] = await connection.query(
        'SELECT COUNT(*) as cnt FROM book_images WHERE book_id = ?', [bookId]
      );
      const remaining = 5 - cnt;
      if (remaining <= 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Maksimal 5 foto per buku.' });
      }

      const filesToAdd = req.files.slice(0, remaining);
      const [[{ maxOrder }]] = await connection.query(
        'SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM book_images WHERE book_id = ?', [bookId]
      );

      const imageValues = filesToAdd.map((file, index) => [
        bookId, file.path, false, maxOrder + 1 + index
      ]);
      await connection.query('INSERT INTO book_images (book_id, url, is_cover, sort_order) VALUES ?', [imageValues]);

      if (cnt === 0) {
        updates.push('cover_image = ?');
        params.push(filesToAdd[0].path);
      }
    }

    if (updates.length > 0) {
      params.push(bookId);
      await connection.query(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await connection.commit();

    const [updated] = await connection.query('SELECT * FROM books WHERE id = ?', [bookId]);
    const images = await getBookImages(bookId);

    res.json({ success: true, message: 'Buku berhasil diupdate', data: { ...updated[0], images } });
  } catch (err) {
    await connection.rollback();
    console.error('[PUT /books/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ─── DELETE /api/books/:id/images/:imageId ───────────────
router.delete('/:id/images/:imageId', verifyToken, async (req, res) => {
  const bookId = safeInt(req.params.id, null);
  const imageId = safeInt(req.params.imageId, null);
  if (!bookId || !imageId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  try {
    const [books] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (books.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    if (req.user.role !== 'admin' && books[0].seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const [images] = await pool.query(
      'SELECT * FROM book_images WHERE id = ? AND book_id = ?', [imageId, bookId]
    );
    if (images.length === 0) return res.status(404).json({ success: false, message: 'Foto tidak ditemukan' });

    await pool.query('DELETE FROM book_images WHERE id = ?', [imageId]);

    if (images[0].is_cover) {
      await pool.query(
        'UPDATE book_images SET is_cover = TRUE WHERE book_id = ? ORDER BY sort_order ASC LIMIT 1',
        [bookId]
      );
    }

    const remainingImages = await getBookImages(bookId);
    res.json({ success: true, message: 'Foto berhasil dihapus', data: { images: remainingImages } });
  } catch (err) {
    console.error('[DELETE /books/:id/images/:imageId]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH /api/books/:id/images/:imageId/cover ──────────
router.patch('/:id/images/:imageId/cover', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookId = safeInt(req.params.id, null);
    const imageId = safeInt(req.params.imageId, null);
    if (!bookId || !imageId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const [books] = await connection.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (books.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    if (req.user.role !== 'admin' && books[0].seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await connection.beginTransaction();
    await connection.query('UPDATE book_images SET is_cover = FALSE WHERE book_id = ?', [bookId]);
    await connection.query('UPDATE book_images SET is_cover = TRUE WHERE id = ? AND book_id = ?', [imageId, bookId]);
    const [[img]] = await connection.query('SELECT url FROM book_images WHERE id = ?', [imageId]);
    if (img) {
      await connection.query('UPDATE books SET cover_image = ? WHERE id = ?', [img.url, bookId]);
    }
    await connection.commit();

    const images = await getBookImages(bookId);
    res.json({ success: true, message: 'Foto cover berhasil diubah', data: { images } });
  } catch (err) {
    await connection.rollback();
    console.error('[PATCH /books/:id/images/:imageId/cover]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ─── DELETE /api/books/:id (seller/admin) ────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  const bookId = safeInt(req.params.id, null);
  if (!bookId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

    const book = rows[0];
    if (req.user.role !== 'admin' && book.seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Cek apakah buku ada di order aktif (seller tidak bisa hapus, admin bisa)
    const [activeOrders] = await connection.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.book_id = ? AND o.delivery_status NOT IN ('delivered', 'cancelled')`,
      [bookId]
    );
    if (activeOrders.length > 0 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus buku yang sedang dalam proses pesanan aktif'
      });
    }

    await connection.beginTransaction();

    // Hapus semua child records agar tidak kena FK constraint error
    await connection.query('DELETE FROM cart_items WHERE book_id = ?', [bookId]);
    await connection.query('DELETE FROM reviews WHERE book_id = ?', [bookId]);
    await connection.query('DELETE FROM book_images WHERE book_id = ?', [bookId]);
    // Hapus order_items yang merujuk buku ini (sudah dipastikan tidak ada order aktif)
    await connection.query('DELETE FROM order_items WHERE book_id = ?', [bookId]);

    await connection.query('DELETE FROM books WHERE id = ?', [bookId]);

    await connection.commit();
    res.json({ success: true, message: 'Buku berhasil dihapus' });
  } catch (err) {
    await connection.rollback();
    console.error('[DELETE /books/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
