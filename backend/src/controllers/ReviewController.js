const pool = require('../config/database');

class ReviewController {
  /**
   * POST /api/reviews/order/:orderId
   * Submit a rating for a completed order.
   * Creates a review for all books in the order.
   */
  static async submitReview(req, res) {
    const { rating, comment } = req.body;
    const orderId = req.params.orderId;
    const buyerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating harus antara 1 dan 5' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validasi order milik buyer dan status = 'completed'
      const [[order]] = await connection.query(
        'SELECT status FROM orders WHERE id = ? AND buyer_id = ?',
        [orderId, buyerId]
      );

      if (!order) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan milik Anda' });
      }

      if (order.status !== 'completed' && order.status !== 'cod_completed') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Hanya order yang sudah selesai yang dapat diberi rating' });
      }

      // 2. Validasi agar tidak duplikat (cek apakah order_id ini sudah di-review oleh buyer)
      const [[existingReview]] = await connection.query(
        'SELECT id FROM reviews WHERE order_id = ? AND buyer_id = ? LIMIT 1',
        [orderId, buyerId]
      );
      if (existingReview) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Anda sudah memberikan rating untuk order ini' });
      }

      // 3. Ambil book_id dari order_items
      const [orderItems] = await connection.query(
        'SELECT book_id FROM order_items WHERE order_id = ?',
        [orderId]
      );

      if (orderItems.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Order tidak memiliki item buku' });
      }

      // 4. Insert review(s) - satu untuk setiap buku dalam order ini
      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO reviews (order_id, book_id, buyer_id, rating, comment)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
          [orderId, item.book_id, buyerId, rating, comment || null]
        );
      }

      await connection.commit();
      res.status(201).json({ success: true, message: 'Rating berhasil disimpan' });
    } catch (err) {
      await connection.rollback();
      console.error('SubmitReview Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/reviews/order/:orderId
   * Mendapatkan rating untuk order tertentu (jika sudah ada)
   */
  static async getOrderReview(req, res) {
    const orderId = req.params.orderId;
    try {
      const [rows] = await pool.query(
        'SELECT rating, comment, created_at FROM reviews WHERE order_id = ? LIMIT 1',
        [orderId]
      );
      if (rows.length === 0) {
        return res.json({ success: true, data: null });
      }
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('GetOrderReview Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * GET /api/reviews/seller
   * Mendapatkan semua review untuk buku-buku milik penjual (berdasarkan buku yang dijual)
   */
  static async getSellerReviews(req, res) {
    const sellerId = req.user.id;
    try {
      // Ambil review berdasarkan buku yang dimiliki seller ini
      const query = `
        SELECT r.id, r.rating, r.comment, r.created_at, b.title as book_title, u.name as buyer_name
        FROM reviews r
        JOIN books b ON r.book_id = b.id
        JOIN users u ON r.buyer_id = u.id
        WHERE b.seller_id = ?
        ORDER BY r.created_at DESC
      `;
      const [reviews] = await pool.query(query, [sellerId]);

      const [[stats]] = await pool.query(
        `SELECT COUNT(r.id) as total_reviews, COALESCE(AVG(r.rating), 0) as avg_rating
         FROM reviews r
         JOIN books b ON r.book_id = b.id
         WHERE b.seller_id = ?`,
        [sellerId]
      );

      res.json({
        success: true,
        data: {
          reviews,
          total_reviews: stats.total_reviews,
          avg_rating: parseFloat(stats.avg_rating).toFixed(1)
        }
      });
    } catch (err) {
      console.error('GetSellerReviews Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = ReviewController;
