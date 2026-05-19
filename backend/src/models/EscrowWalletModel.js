const pool = require('../config/database');

// ─────────────────────────────────────────────
// EscrowTransaction Model
// ─────────────────────────────────────────────
class EscrowTransactionModel {
  /** Buat record escrow baru ketika pembayaran berhasil */
  static async create({ orderId, sellerId, buyerId, amount, autoReleaseDays = 3 }, connection = null) {
    const autoReleaseAt = new Date();
    autoReleaseAt.setDate(autoReleaseAt.getDate() + autoReleaseDays);

    const db = connection || pool; // gunakan connection dari transaksi jika ada
    const [result] = await db.query(
      `INSERT INTO escrow_transactions (order_id, seller_id, buyer_id, amount, status, auto_release_at)
       VALUES (?, ?, ?, ?, 'held', ?)`,
      [orderId, sellerId, buyerId, amount, autoReleaseAt]
    );
    return result.insertId;
  }

  /** Cari semua escrow berdasarkan order_id */
  static async findByOrderId(orderId) {
    const [rows] = await pool.query(
      'SELECT * FROM escrow_transactions WHERE order_id = ?',
      [orderId]
    );
    return rows;
  }

  /** Cari satu escrow berdasarkan id */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /** Cari semua escrow milik buyer */
  static async findByBuyerId(buyerId) {
    const [rows] = await pool.query(
      `SELECT et.*, o.delivery_status, o.payment_status,
              u.name AS seller_name
       FROM escrow_transactions et
       JOIN orders o ON et.order_id = o.id
       JOIN users u ON et.seller_id = u.id
       WHERE et.buyer_id = ?
       ORDER BY et.created_at DESC`,
      [buyerId]
    );
    return rows;
  }

  /** Cari semua escrow milik seller */
  static async findBySellerId(sellerId) {
    const [rows] = await pool.query(
      `SELECT et.*, o.delivery_status, o.payment_status,
              u.name AS buyer_name
       FROM escrow_transactions et
       JOIN orders o ON et.order_id = o.id
       JOIN users u ON et.buyer_id = u.id
       WHERE et.seller_id = ?
       ORDER BY et.created_at DESC`,
      [sellerId]
    );
    return rows;
  }

  /** Ubah status escrow ke 'released' dan set released_at */
  static async release(connection, escrowId) {
    const [result] = await connection.query(
      `UPDATE escrow_transactions
       SET status = 'released', released_at = NOW()
       WHERE id = ? AND status IN ('held', 'disputed')`,
      [escrowId]
    );
    return result.affectedRows > 0;
  }

  /** Ubah status escrow ke 'refunded' */
  static async refund(connection, escrowId) {
    const [result] = await connection.query(
      `UPDATE escrow_transactions
       SET status = 'refunded', released_at = NOW()
       WHERE id = ? AND status IN ('held', 'disputed')`,
      [escrowId]
    );
    return result.affectedRows > 0;
  }

  /** Ubah status escrow ke 'disputed' (bekukan dana) */
  static async markDisputed(connection, escrowId) {
    const [result] = await connection.query(
      `UPDATE escrow_transactions
       SET status = 'disputed'
       WHERE id = ? AND status = 'held'`,
      [escrowId]
    );
    return result.affectedRows > 0;
  }

  /** Cari escrow yang sudah lewat auto_release_at dan masih 'held' */
  static async findExpiredHeld() {
    const [rows] = await pool.query(
      `SELECT * FROM escrow_transactions
       WHERE status = 'held' AND auto_release_at <= NOW()`
    );
    return rows;
  }
}

// ─────────────────────────────────────────────
// SellerWallet Model
// ─────────────────────────────────────────────
class SellerWalletModel {
  /** Cari wallet berdasarkan seller_id */
  static async findBySellerId(sellerId) {
    const [rows] = await pool.query(
      'SELECT * FROM seller_wallets WHERE seller_id = ?',
      [sellerId]
    );
    return rows[0];
  }

  /** Buat wallet baru untuk seller (jika belum ada) */
  static async createIfNotExists(connection, sellerId) {
    await connection.query(
      `INSERT IGNORE INTO seller_wallets (seller_id, balance_available, balance_hold, total_earned)
       VALUES (?, 0, 0, 0)`,
      [sellerId]
    );
  }

  /** Tambah balance_available dan total_earned setelah escrow dilepas */
  static async credit(connection, sellerId, amount) {
    const [result] = await connection.query(
      `UPDATE seller_wallets
       SET balance_available = balance_available + ?,
           total_earned = total_earned + ?
       WHERE seller_id = ?`,
      [amount, amount, sellerId]
    );
    return result.affectedRows > 0;
  }

  /** Kurangi balance_available saat penarikan (opsional di masa depan) */
  static async debit(connection, sellerId, amount) {
    const [result] = await connection.query(
      `UPDATE seller_wallets
       SET balance_available = balance_available - ?
       WHERE seller_id = ? AND balance_available >= ?`,
      [amount, sellerId, amount]
    );
    return result.affectedRows > 0;
  }
}

// ─────────────────────────────────────────────
// Legacy support (tetap ada untuk backward-compat)
// ─────────────────────────────────────────────
class EscrowWalletModel {
  static async findByUserId(userId) {
    return SellerWalletModel.findBySellerId(userId);
  }
  static async create(userId) {
    const conn = await pool.getConnection();
    try {
      await SellerWalletModel.createIfNotExists(conn, userId);
    } finally {
      conn.release();
    }
  }
}

module.exports = { EscrowTransactionModel, SellerWalletModel, EscrowWalletModel };
