const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// ─── GET /api/dashboard/admin ─────────────────────────────
router.get('/admin', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users WHERE role != "admin"');
    const [[{ total_books }]] = await pool.query('SELECT COUNT(*) as total_books FROM books');
    const [[{ pending_books }]] = await pool.query('SELECT COUNT(*) as pending_books FROM books WHERE is_approved = FALSE AND is_available = TRUE');
    const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    const [[{ total_revenue }]] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE payment_status = "paid"');
    const [[{ total_sellers }]] = await pool.query('SELECT COUNT(*) as total_sellers FROM users WHERE role = "seller"');
    const [[{ total_buyers }]] = await pool.query('SELECT COUNT(*) as total_buyers FROM users WHERE role != "admin"');

    // Recent orders
    const [recent_orders] = await pool.query(
      `SELECT o.id, o.total_amount, o.delivery_status, o.payment_status, o.created_at, u.name as buyer_name
       FROM orders o JOIN users u ON o.buyer_id = u.id ORDER BY o.created_at DESC LIMIT 5`
    );

    // Recent users
    const [recent_users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    // Books by category
    const [books_by_category] = await pool.query(
      `SELECT c.name, COUNT(b.id) as count FROM categories c LEFT JOIN books b ON b.category_id = c.id GROUP BY c.id ORDER BY count DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_users, total_books, pending_books, total_orders,
        total_revenue, total_sellers, total_buyers,
        recent_orders, recent_users, books_by_category
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/dashboard/seller ────────────────────────────
router.get('/seller', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;

    const [[{ total_books }]] = await pool.query('SELECT COUNT(*) as total_books FROM books WHERE seller_id = ?', [sellerId]);
    const [[{ active_books }]] = await pool.query('SELECT COUNT(*) as active_books FROM books WHERE seller_id = ? AND is_available = TRUE AND is_approved = TRUE', [sellerId]);
    const [[{ total_orders }]] = await pool.query('SELECT COUNT(DISTINCT o.id) as total_orders FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE oi.seller_id = ?', [sellerId]);
    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as total_revenue
       FROM order_items oi JOIN orders o ON oi.order_id = o.id
       WHERE oi.seller_id = ? AND o.payment_status = 'paid'`,
      [sellerId]
    );

    // Wallet balance
    await pool.query(
      `INSERT IGNORE INTO seller_wallets (seller_id, balance_available, balance_hold, total_earned)
       VALUES (?, 0, 0, 0)`,
      [sellerId]
    );
    const [walletRows] = await pool.query(
      `SELECT balance_available, balance_hold, total_earned,
              COALESCE(total_withdrawn, 0) AS total_withdrawn
       FROM seller_wallets WHERE seller_id = ?`,
      [sellerId]
    );
    const wallet = walletRows[0] || { balance_available: 0, balance_hold: 0, total_earned: 0, total_withdrawn: 0 };

    // Recent orders for seller
    const [recent_orders] = await pool.query(
      `SELECT o.id, o.delivery_status, o.payment_status, o.created_at, u.name as buyer_name,
       GROUP_CONCAT(b.title SEPARATOR ', ') as book_titles
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN books b ON oi.book_id = b.id
       JOIN users u ON o.buyer_id = u.id
       WHERE oi.seller_id = ?
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
      [sellerId]
    );

    // Top selling books
    const [top_books] = await pool.query(
      `SELECT b.title, b.price, COALESCE(SUM(oi.quantity), 0) as sold_qty
       FROM books b LEFT JOIN order_items oi ON b.id = oi.book_id
       WHERE b.seller_id = ?
       GROUP BY b.id ORDER BY sold_qty DESC LIMIT 5`,
      [sellerId]
    );

    res.json({
      success: true,
      data: {
        total_books, active_books, total_orders, total_revenue, recent_orders, top_books,
        wallet: {
          available_balance: parseFloat(wallet.balance_available),
          pending_balance:   parseFloat(wallet.balance_hold),
          total_earned:      parseFloat(wallet.total_earned),
          total_withdrawn:   parseFloat(wallet.total_withdrawn),
        },
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/dashboard/buyer ─────────────────────────────
router.get('/buyer', verifyToken, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) as total_orders FROM orders WHERE buyer_id = ?', [buyerId]);
    const [[{ total_spent }]] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE buyer_id = ? AND payment_status = "paid"', [buyerId]);
    const [[{ cart_count }]] = await pool.query('SELECT COUNT(*) as cart_count FROM cart_items WHERE user_id = ?', [buyerId]);

    const [recent_orders] = await pool.query(
      `SELECT o.id, o.total_amount, o.delivery_status, o.payment_status, o.created_at,
       GROUP_CONCAT(b.title SEPARATOR ', ') as book_titles
       FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN books b ON oi.book_id = b.id
       WHERE o.buyer_id = ? GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
      [buyerId]
    );

    res.json({ success: true, data: { total_orders, total_spent, cart_count, recent_orders } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
