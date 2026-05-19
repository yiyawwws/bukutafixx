const pool = require('../config/database');
const { pakasir, PAYMENT_METHODS } = require('../config/pakasir');
const { EscrowTransactionModel, SellerWalletModel } = require('../models/EscrowWalletModel');
const OrderFlowService = require('../services/OrderFlowService');

/**
 * Format order_id untuk Pakasir:
 * Gunakan format BKT-{orderId}-{timestamp} agar setiap percobaan unik
 * (menghindari konflik duplicate order_id di sisi Pakasir)
 */
function formatPakasirOrderId(orderId) {
  const ts = Date.now().toString().slice(-6); // 6 digit terakhir timestamp
  return `BKT${orderId}T${ts}`;
}

/**
 * Parse order_id dari Pakasir kembali ke orderId internal
 */
function parsePakasirOrderId(pakasirOrderId) {
  const m = pakasirOrderId.match(/^BKT(\d+)T/);
  return m ? m[1] : pakasirOrderId.replace(/^BKT-?/, '');
}

class OrderController {

  /**
   * GET /api/pay/methods
   * Daftar metode pembayaran yang tersedia
   */
  static async getPaymentMethods(req, res) {
    try {
      const methods = Object.entries(PAYMENT_METHODS).map(([code, info]) => ({
        code,
        label: info.label,
        fee_type: info.fee_type,
        fee: info.fee,
        min_fee: info.min_fee || null,
      }));

      res.json({ success: true, data: methods });
    } catch (err) {
      console.error('[getPaymentMethods Error]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * POST /api/pay/create
   * Buyer memulai pembayaran untuk order yang sudah ada.
   * Body: { order_id, payment_method, redirect_url? }
   * 
   * Flow:
   * 1. Validasi order (milik buyer, masih pending)
   * 2. Buat payment di Pakasir
   * 3. Simpan pakasir_order_id ke order
   * 4. Return payment_url ke frontend
   */
  static async createPayment(req, res) {
    const { order_id, payment_method = 'qris', redirect_url } = req.body;
    const buyerId = req.user.id;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id wajib diisi' });
    }

    const validMethods = Object.keys(PAYMENT_METHODS);
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Metode pembayaran tidak valid. Pilihan: ${validMethods.join(', ')}`
      });
    }

    try {
      // 1. Ambil order
      const [[order]] = await pool.query(
        'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
        [order_id, buyerId]
      );
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan milik Anda' });
      }
      if (order.payment_status === 'paid') {
        return res.status(400).json({ success: false, message: 'Order sudah dibayar' });
      }
      if (order.delivery_status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Order sudah dibatalkan' });
      }

      // 2. Jika order sudah punya pakasir_order_id & payment_url, kembalikan langsung
      if (order.pakasir_order_id && order.payment_url) {
        console.log(`[createPayment] Order ${order_id} already has Pakasir ID: ${order.pakasir_order_id}`);
        return res.status(200).json({
          success: true,
          message: 'Payment sudah dibuat sebelumnya. Gunakan link pembayaran berikut.',
          data: {
            order_id: parseInt(order_id),
            pakasir_order_id: order.pakasir_order_id,
            payment_method: order.payment_method,
            amount: Math.round(parseFloat(order.total_amount)),
            fee: order.payment_fee || 0,
            total_payment: order.payment_total || Math.round(parseFloat(order.total_amount)),
            payment_url: order.payment_url,
            payment_number: order.payment_number || null,
            expired_at: order.payment_expired_at || null,
            status: 'pending',
          }
        });
      }

      // 3. Buat payment baru di Pakasir
      // Gunakan format dengan timestamp agar tidak pernah duplikat
      const pakasirOrderId = formatPakasirOrderId(order_id);
      const amount = Math.round(parseFloat(order.total_amount));

      const finalRedirectUrl = redirect_url
        || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/buyer/orders`;

      console.log(`[createPayment] Creating Pakasir payment: method=${payment_method}, pakasirId=${pakasirOrderId}, amount=${amount}`);

      const payment = await pakasir.createPayment(
        payment_method,
        pakasirOrderId,
        amount,
        finalRedirectUrl
      );

      console.log(`[createPayment] Pakasir response:`, JSON.stringify(payment));

      // 4. Simpan info payment ke order
      await pool.query(
        `UPDATE orders SET
           pakasir_order_id = ?,
           payment_method = ?,
           payment_fee = ?,
           payment_total = ?,
           payment_url = ?,
           payment_number = ?,
           payment_expired_at = ?
         WHERE id = ?`,
        [
          payment.order_id,
          payment.payment_method,
          payment.fee,
          payment.total_payment,
          payment.payment_url,
          payment.payment_number || null,
          payment.expired_at ? new Date(payment.expired_at) : null,
          order_id,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Payment berhasil dibuat. Silakan lanjutkan ke halaman pembayaran.',
        data: {
          order_id: parseInt(order_id),
          pakasir_order_id: payment.order_id,
          payment_method: payment.payment_method,
          amount: payment.amount,
          fee: payment.fee,
          total_payment: payment.total_payment,
          payment_url: payment.payment_url,
          payment_number: payment.payment_number,
          expired_at: payment.expired_at,
          status: payment.status,
        }
      });
    } catch (err) {
      console.error('[createPayment Error] message:', err.message);
      if (err.response) {
        console.error('[createPayment Error] HTTP:', err.response.status, JSON.stringify(err.response.data));
      } else {
        console.error('[createPayment Error] stack:', err.stack?.split('\n').slice(0, 5).join('\n'));
      }
      const detail = err.message || 'Unknown error';
      res.status(500).json({ success: false, message: `Gagal membuat payment: ${detail}` });
    }
  }

  /**
   * GET /api/pay/status/:orderId
   * Cek status pembayaran dari Pakasir dan sync ke DB.
   * Jika status 'completed' → ubah payment_status = 'paid'
   */
  static async checkPaymentStatus(req, res) {
    const { orderId } = req.params;
    const buyerId = req.user.id;

    try {
      // Ambil order dari DB
      const [[order]] = await pool.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
      }

      // Validasi akses: buyer, seller dari order ini, atau admin
      if (req.user.role !== 'admin' && order.buyer_id !== buyerId) {
        const [sellerItems] = await pool.query(
          'SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?',
          [orderId, buyerId]
        );
        if (sellerItems.length === 0) {
          return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }
      }

      // Jika belum ada pakasir_order_id, payment belum dibuat
      if (!order.pakasir_order_id) {
        return res.json({
          success: true,
          data: {
            order_id: parseInt(orderId),
            payment_status: order.payment_status,
            pakasir_status: null,
            message: 'Payment belum dibuat. Lakukan POST /api/pay/create terlebih dahulu.'
          }
        });
      }

      // Cek status ke Pakasir
      const amount = Math.round(parseFloat(order.total_amount));
      const pakasirDetail = await pakasir.detailPayment(order.pakasir_order_id, amount);

      // Jika completed di Pakasir tapi DB masih pending → sync via OrderFlowService (idempotent)
      if (pakasirDetail.status === 'completed' && order.payment_status !== 'paid') {
        try {
          await OrderFlowService.handlePaymentSuccess(orderId);
          console.log(`[Pakasir] Payment success synced for order ${orderId}`);
        } catch (flowErr) {
          console.error('[checkPaymentStatus Flow Error]', flowErr.message);
        }
      }

      // Jika canceled di Pakasir
      if (pakasirDetail.status === 'canceled' && order.payment_status === 'pending') {
        await pool.query(
          `UPDATE orders SET payment_status = 'failed' WHERE id = ?`,
          [orderId]
        );
      }

      res.json({
        success: true,
        data: {
          order_id: parseInt(orderId),
          payment_status: pakasirDetail.status === 'completed' ? 'paid' :
                          pakasirDetail.status === 'canceled'  ? 'failed' : 'pending',
          pakasir_status: pakasirDetail.status,
          payment_method: pakasirDetail.payment_method,
          amount: pakasirDetail.amount,
          fee: pakasirDetail.fee,
          total_payment: pakasirDetail.total_payment,
          payment_url: pakasirDetail.payment_url,
          payment_number: pakasirDetail.payment_number,
          expired_at: pakasirDetail.expired_at,
          completed_at: pakasirDetail.completed_at,
        }
      });
    } catch (err) {
      console.error('[checkPaymentStatus Error]', err.message);
      res.status(500).json({ success: false, message: 'Gagal mengecek status payment' });
    }
  }

  /**
   * POST /api/pay/cancel/:orderId
   * Buyer cancel pembayaran yang pending.
   */
  static async cancelPayment(req, res) {
    const { orderId } = req.params;
    const buyerId = req.user.id;

    try {
      const [[order]] = await pool.query(
        'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
        [orderId, buyerId]
      );
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan milik Anda' });
      }
      if (order.payment_status === 'paid') {
        return res.status(400).json({ success: false, message: 'Tidak bisa cancel payment yang sudah dibayar' });
      }
      if (!order.pakasir_order_id) {
        return res.status(400).json({ success: false, message: 'Belum ada payment yang dibuat untuk order ini' });
      }

      const amount = Math.round(parseFloat(order.total_amount));
      await pakasir.cancelPayment(order.pakasir_order_id, amount);

      await pool.query(
        `UPDATE orders SET payment_status = 'failed' WHERE id = ?`,
        [orderId]
      );

      res.json({
        success: true,
        message: 'Payment berhasil dibatalkan',
        data: { order_id: parseInt(orderId) }
      });
    } catch (err) {
      console.error('[cancelPayment Error]', err.message);
      res.status(500).json({ success: false, message: 'Gagal membatalkan payment' });
    }
  }

  /**
   * POST /api/pay/simulate/:orderId  [DEVELOPMENT ONLY]
   * Simulasi pembayaran sukses untuk testing.
   */
  static async simulatePayment(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Fitur ini hanya tersedia di development' });
    }

    const { orderId } = req.params;

    try {
      const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
      if (!order.pakasir_order_id) {
        return res.status(400).json({ success: false, message: 'Buat payment terlebih dahulu via POST /api/pay/create' });
      }

      const amount = Math.round(parseFloat(order.total_amount));
      const result = await pakasir.simulationPayment(order.pakasir_order_id, amount);

      // Jika simulasi sukses, update DB via OrderFlowService (handles unified status + escrow)
      if (result.status === 'completed') {
        try {
          await OrderFlowService.handlePaymentSuccess(orderId);
        } catch (flowErr) {
          console.error('[simulatePayment Flow Error]', flowErr.message);
          // Fallback to legacy update if service fails
          await pool.query(
            `UPDATE orders SET payment_status = 'paid', delivery_status = 'processing' WHERE id = ?`,
            [orderId]
          );
        }
      }

      res.json({
        success: true,
        message: '[DEV] Simulasi payment berhasil',
        data: result
      });
    } catch (err) {
      console.error('[simulatePayment Error]', err.message);
      res.status(500).json({ success: false, message: 'Gagal melakukan simulasi payment' });
    }
  }

  /**
   * PATCH /api/order/confirm (legacy)
   * Konfirmasi penerimaan barang & cairkan escrow.
   */
  static async confirmOrder(req, res) {
    const { order_id } = req.body;
    const buyerId = req.user?.id;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id wajib diisi' });
    }

    try {
      // Use OrderFlowService for atomic state transition
      const result = await OrderFlowService.confirmOrderReceived(parseInt(order_id), buyerId);
      res.json({
        success: true,
        message: 'Order dikonfirmasi. Dana telah dicairkan ke penjual.',
        data: { order_id: parseInt(order_id), escrows_released: result.escrowsReleased }
      });
    } catch (err) {
      console.error('[confirmOrder Error]', err.message);
      res.status(400).json({ success: false, message: err.message || 'Server error' });
    }
  }
}

module.exports = OrderController;
