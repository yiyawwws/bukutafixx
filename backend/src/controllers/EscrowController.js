const pool = require('../config/database');
const { EscrowTransactionModel, SellerWalletModel } = require('../models/EscrowWalletModel');

class EscrowController {
  /**
   * GET /api/escrow/my
   * Pembeli atau penjual melihat daftar escrow miliknya.
   */
  static async getMyEscrow(req, res) {
    try {
      const userId = req.user.id;
      const activeRole = req.user.active_role || req.user.role;

      let escrows;
      if (activeRole === 'seller') {
        escrows = await EscrowTransactionModel.findBySellerId(userId);
      } else {
        escrows = await EscrowTransactionModel.findByBuyerId(userId);
      }

      res.json({
        success: true,
        data: escrows,
        role: activeRole,
      });
    } catch (err) {
      console.error('[GetMyEscrow Error]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * GET /api/escrow/wallet
   * Penjual melihat saldo wallet-nya.
   */
  static async getWalletBalance(req, res) {
    const sellerId = req.user.id;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await SellerWalletModel.createIfNotExists(connection, sellerId);
      await connection.commit();
    } catch (e) {
      try { await connection.rollback(); } catch (_) {}
    } finally {
      connection.release();
    }

    try {
      const wallet = await SellerWalletModel.findBySellerId(sellerId);
      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet tidak ditemukan' });
      }

      res.json({
        success: true,
        data: {
          balance_available: parseFloat(wallet.balance_available || 0),
          balance_hold: parseFloat(wallet.balance_hold || 0),
          total_earned: parseFloat(wallet.total_earned || 0),
          updated_at: wallet.updated_at,
        },
      });
    } catch (err) {
      console.error('[GetWalletBalance Error]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * POST /api/escrow/confirm/:orderId
   * Pembeli konfirmasi buku sudah diterima → dana cair ke wallet penjual.
   */
  static async confirmReceived(req, res) {
    const { orderId } = req.params;
    const buyerId = req.user.id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
        [orderId, buyerId]
      );
      if (!order) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan milik Anda' });
      }

      if (order.payment_status !== 'paid') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Pembayaran belum dikonfirmasi oleh penjual/admin' });
      }

      if (order.delivery_status === 'delivered') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Order sudah dikonfirmasi sebelumnya' });
      }

      // Cek escrow yang sedang disputed — beri pesan jelas
      const [disputedEscrows] = await connection.query(
        `SELECT * FROM escrow_transactions WHERE order_id = ? AND status = 'disputed'`,
        [orderId]
      );
      if (disputedEscrows.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Dana sedang dalam proses dispute. Hubungi admin untuk penyelesaian.'
        });
      }

      const [escrows] = await connection.query(
        `SELECT * FROM escrow_transactions WHERE order_id = ? AND status = 'held'`,
        [orderId]
      );

      if (escrows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Tidak ada escrow aktif untuk order ini' });
      }

      for (const escrow of escrows) {
        await EscrowTransactionModel.release(connection, escrow.id);
        await SellerWalletModel.createIfNotExists(connection, escrow.seller_id);
        await SellerWalletModel.credit(connection, escrow.seller_id, escrow.amount);
      }

      await connection.query(
        `UPDATE orders SET delivery_status = 'delivered' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Penerimaan buku dikonfirmasi. Dana telah dicairkan ke penjual.',
        data: { order_id: parseInt(orderId), escrows_released: escrows.length },
      });
    } catch (err) {
      await connection.rollback();
      console.error('[ConfirmReceived Error]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/escrow/status/:orderId
   * Cek status escrow untuk satu order tertentu.
   */
  static async getEscrowStatus(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
      }

      const escrows = await EscrowTransactionModel.findByOrderId(orderId);

      const isBuyer = orders[0].buyer_id === userId;
      const isSeller = escrows.some((e) => e.seller_id === userId);
      const isAdmin = req.user.role === 'admin';

      if (!isBuyer && !isSeller && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Akses ditolak' });
      }

      res.json({ success: true, data: escrows });
    } catch (err) {
      console.error('[GetEscrowStatus Error]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = EscrowController;
