const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { EscrowTransactionModel, SellerWalletModel } = require('../models/EscrowWalletModel');
const ShipmentController = require('../controllers/ShipmentController');
const ComplaintController = require('../controllers/ComplaintController');
const uploadShipmentProof = require('../middleware/uploadShipmentProof');

const router = express.Router();

// ─── Helper ────────────────────────────────────────────────
function safeInt(val, fallback = 1) {
  const n = parseInt(val);
  return isNaN(n) ? fallback : n;
}

// ─── GET /api/orders ─────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, payment_status, page = 1, limit = 10 } = req.query;
    const offset = (safeInt(page, 1) - 1) * safeInt(limit, 10);

    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'admin') {
      // admin sees all
    } else if (req.user.active_role === 'seller') {
      where += ' AND o.id IN (SELECT DISTINCT order_id FROM order_items WHERE seller_id = ?)';
      params.push(req.user.id);
    } else {
      where += ' AND o.buyer_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(status)) { where += ' AND o.delivery_status = ?'; params.push(status); }
    }
    if (payment_status) {
      const validPayment = ['pending', 'paid', 'failed'];
      if (validPayment.includes(payment_status)) { where += ' AND o.payment_status = ?'; params.push(payment_status); }
    }

    const [rows] = await pool.query(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email
       FROM orders o JOIN users u ON o.buyer_id = u.id
       ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, safeInt(limit, 10), safeInt(offset, 0)]
    );

    for (const order of rows) {
      const [items] = await pool.query(
        `SELECT oi.*, b.title, b.author, b.condition,
         COALESCE(
           (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
           b.cover_image
         ) as cover_url
         FROM order_items oi JOIN books b ON oi.book_id = b.id WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM orders o ${where}`, params);
    res.json({ success: true, data: rows, total, page: safeInt(page, 1), limit: safeInt(limit, 10) });
  } catch (err) {
    console.error('[GET /orders]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/orders/:id ─────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  const orderId = safeInt(req.params.id, null);
  if (!orderId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  try {
    const [rows] = await pool.query(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
       FROM orders o JOIN users u ON o.buyer_id = u.id WHERE o.id = ?`,
      [orderId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    const order = rows[0];

    if (req.user.role !== 'admin' && order.buyer_id !== req.user.id) {
      const [sellerItems] = await pool.query(
        'SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?',
        [order.id, req.user.id]
      );
      if (sellerItems.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const [items] = await pool.query(
      `SELECT oi.*, b.title, b.author, b.condition, u.name as seller_name, u.phone as seller_phone,
       COALESCE(
         (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id AND bi.is_cover = TRUE LIMIT 1),
         b.cover_image
       ) as cover_url
       FROM order_items oi
       JOIN books b ON oi.book_id = b.id
       JOIN users u ON oi.seller_id = u.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;

    // Sertakan info WA penjual per item
    for (const item of order.items) {
      if (item.seller_phone) {
        const phone = item.seller_phone.replace(/\D/g, '');
        const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
        item.seller_whatsapp = `https://wa.me/${waPhone}`;
      } else {
        item.seller_whatsapp = null;
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[GET /orders/:id]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/orders (checkout) ─────────────────────────
router.post('/',
  verifyToken,
  [
    body('shipping_address').optional({ checkFalsy: true }).trim(),
    body('notes').optional().trim(),
    body('cart_item_ids').optional().isArray().withMessage('cart_item_ids harus array'),
    body('fulfillment_method').optional().isIn(['seller_shipping', 'campus_cod']).withMessage('Metode pengiriman tidak valid'),
    body('meetup_location').optional().trim(),
    body('meetup_time').optional().trim(),
    body('meetup_note').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { shipping_address, notes, cart_item_ids, fulfillment_method = 'seller_shipping', meetup_location, meetup_time, meetup_note } = req.body;

    if (fulfillment_method === 'seller_shipping' && !shipping_address) {
      return res.status(422).json({ success: false, errors: [{ msg: 'Alamat pengiriman wajib diisi untuk metode pengiriman ini' }] });
    }
    if (fulfillment_method === 'campus_cod' && (!meetup_location || !meetup_time)) {
      return res.status(422).json({ success: false, errors: [{ msg: 'Lokasi dan waktu pertemuan wajib diisi untuk Campus COD' }] });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // ── Cek verifikasi akun pembeli ────────────────────────
      const [[buyer]] = await conn.query(
        'SELECT is_verified, role FROM users WHERE id = ?',
        [req.user.id]
      );
      if (!buyer) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Akun tidak ditemukan' });
      }
      if (buyer.role !== 'admin' && !buyer.is_verified) {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          message: 'Akun Anda belum diverifikasi oleh admin. Silakan tunggu proses verifikasi sebelum melakukan checkout.',
          code: 'ACCOUNT_NOT_VERIFIED',
        });
      }
      // ──────────────────────────────────────────────────────

      let cartQuery = `SELECT ci.*, b.price, b.stock, b.seller_id, b.title, b.is_available, b.is_approved
                       FROM cart_items ci JOIN books b ON ci.book_id = b.id
                       WHERE ci.user_id = ?`;
      const cartParams = [req.user.id];

      if (cart_item_ids && cart_item_ids.length > 0) {
        const safeIds = cart_item_ids.filter(id => Number.isInteger(id) && id > 0);
        if (safeIds.length > 0) {
          cartQuery += ` AND ci.id IN (${safeIds.map(() => '?').join(',')})`;
          cartParams.push(...safeIds);
        }
      }

      cartQuery += ' FOR UPDATE';

      const [cartItems] = await conn.query(cartQuery, cartParams);

      if (cartItems.length === 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Keranjang kosong atau item tidak ditemukan' });
      }

      for (const item of cartItems) {
        if (!item.is_available || !item.is_approved) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: `Buku "${item.title}" tidak tersedia atau belum disetujui` });
        }
        if (item.quantity > item.stock) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: `Stok buku "${item.title}" tidak cukup (tersisa ${item.stock})` });
        }
        // Pembeli tidak bisa membeli buku milik sendiri
        if (item.seller_id === req.user.id) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: `Anda tidak bisa membeli buku "${item.title}" milik sendiri` });
        }
      }

      const total_amount = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

      const payment_method = fulfillment_method === 'campus_cod' ? 'cash_on_meetup' : null;
      const initial_status = fulfillment_method === 'campus_cod' ? 'cod_pending' : 'pending_payment';

      const [orderResult] = await conn.query(
        `INSERT INTO orders 
         (buyer_id, total_amount, shipping_address, notes, payment_status, delivery_status, 
          fulfillment_method, payment_method, status, meetup_location, meetup_time, meetup_note) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          req.user.id, 
          total_amount, 
          shipping_address || 'Campus COD', 
          notes || null, 
          'pending', 
          'pending',
          fulfillment_method,
          payment_method,
          initial_status,
          meetup_location || null,
          meetup_time || null,
          meetup_note || null
        ]
      );
      const orderId = orderResult.insertId;

      for (const item of cartItems) {
        await conn.query(
          'INSERT INTO order_items (order_id, book_id, seller_id, quantity, price_at_purchase) VALUES (?,?,?,?,?)',
          [orderId, item.book_id, item.seller_id, item.quantity, item.price]
        );
        await conn.query('UPDATE books SET stock = stock - ? WHERE id = ?', [item.quantity, item.book_id]);
        await conn.query('UPDATE books SET is_available = FALSE WHERE id = ? AND stock <= 0', [item.book_id]);
      }

      // Auto-create Escrow per seller ONLY IF seller_shipping
      if (fulfillment_method === 'seller_shipping') {
        const sellerAmounts = {};
        for (const item of cartItems) {
          sellerAmounts[item.seller_id] = (sellerAmounts[item.seller_id] || 0) + parseFloat(item.price) * item.quantity;
        }
        for (const [sellerId, amount] of Object.entries(sellerAmounts)) {
          await SellerWalletModel.createIfNotExists(conn, parseInt(sellerId));
          await EscrowTransactionModel.create({
            orderId,
            sellerId: parseInt(sellerId),
            buyerId: req.user.id,
            amount,
            autoReleaseDays: 3,
          }, conn);
        }
      }

      const cartIds = cartItems.map(i => i.id);
      await conn.query(`DELETE FROM cart_items WHERE id IN (${cartIds.map(() => '?').join(',')})`, cartIds);

      await conn.commit();

      // Ambil info rekening pembayaran dari .env
      const paymentInfo = {
        bank: process.env.PAYMENT_BANK || 'BCA',
        account_number: process.env.PAYMENT_ACCOUNT_NUMBER || '-',
        account_name: process.env.PAYMENT_ACCOUNT_NAME || '-',
        amount: total_amount,
        note: `Harap transfer tepat ${total_amount.toLocaleString('id-ID')} dan kirim bukti ke WhatsApp admin.`,
      };

      res.status(201).json({
        success: true,
        message: 'Pesanan berhasil dibuat. Silakan lakukan pembayaran.',
        order_id: orderId,
        total_amount,
        payment_info: paymentInfo,
      });
    } catch (err) {
      await conn.rollback();
      console.error('[POST /orders]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      conn.release();
    }
  }
);

// ─── PUT /api/orders/:id/status ──────────────────────────
// Hanya seller (untuk order mereka) atau admin bisa update status
router.put('/:id/status', verifyToken, async (req, res) => {
  const orderId = safeInt(req.params.id, null);
  if (!orderId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  const { delivery_status, payment_status } = req.body;

  try {
    const [rows] = await pool.query(
      `SELECT o.*, u.name as buyer_name FROM orders o JOIN users u ON o.buyer_id = u.id WHERE o.id = ?`,
      [orderId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    const order = rows[0];

    // Validasi hak akses: admin atau seller yang punya item di order ini
    if (req.user.role !== 'admin') {
      const [sellerItems] = await pool.query(
        'SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?',
        [orderId, req.user.id]
      );
      if (sellerItems.length === 0) {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Anda bukan penjual di order ini.' });
      }
    }

    const updates = [];
    const params = [];

    if (delivery_status) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(delivery_status)) {
        return res.status(400).json({ success: false, message: 'Status pengiriman tidak valid' });
      }
      updates.push('delivery_status = ?'); params.push(delivery_status);
    }
    if (payment_status && req.user.role === 'admin') {
      // Hanya admin yang bisa update payment_status langsung
      const validPayment = ['pending', 'paid', 'failed'];
      if (!validPayment.includes(payment_status)) {
        return res.status(400).json({ success: false, message: 'Status pembayaran tidak valid' });
      }
      updates.push('payment_status = ?'); params.push(payment_status);
    }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada status yang diupdate' });

    params.push(orderId);
    await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Status order diupdate' });
  } catch (err) {
    console.error('[PUT /orders/:id/status]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/orders/:id/cancel ──────────────────────────
// Buyer bisa cancel order yang masih pending pembayaran
const { pakasir } = require('../config/pakasir'); // Ensure pakasir is imported

router.put('/:id/cancel', verifyToken, async (req, res) => {
  const orderId = safeInt(req.params.id, null);
  if (!orderId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    // Hanya buyer atau admin yang bisa cancel
    if (req.user.role !== 'admin' && order.buyer_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Hanya bisa cancel jika belum paid
    if (order.payment_status === 'paid') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Order yang sudah dibayar tidak bisa dibatalkan langsung. Ajukan komplain.' });
    }

    // Kembalikan stok (tanpa memaksa is_available=TRUE — biarkan penjual yang kelola visibilitas)
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      await conn.query('UPDATE books SET stock = stock + ? WHERE id = ?', [item.quantity, item.book_id]);
      // Hanya re-enable jika buku memang masih aktif (tidak sengaja di-delist penjual)
      await conn.query(
        'UPDATE books SET is_available = TRUE WHERE id = ? AND stock > 0 AND is_approved = TRUE',
        [item.book_id]
      );
    }

    // Hapus escrow yang belum released
    await conn.query(`DELETE FROM escrow_transactions WHERE order_id = ? AND status = 'held'`, [orderId]);

    // Cancel payment at Pakasir if it exists
    if (order.pakasir_order_id) {
      try {
        const amount = Math.round(parseFloat(order.total_amount));
        await pakasir.cancelPayment(order.pakasir_order_id, amount);
        console.log(`[Cancel Order] Successfully cancelled Pakasir payment ${order.pakasir_order_id}`);
      } catch (pakasirErr) {
        console.warn(`[Cancel Order] Warning: Failed to cancel Pakasir payment ${order.pakasir_order_id}. Error: ${pakasirErr.message}`);
        // We continue with local DB cancellation even if Pakasir cancellation fails
      }
    }

    await conn.query(`UPDATE orders SET status = 'cancelled', delivery_status = 'cancelled', payment_status = 'failed' WHERE id = ?`, [orderId]);

    await conn.commit();
    res.json({ success: true, message: 'Order berhasil dibatalkan dan stok dikembalikan' });
  } catch (err) {
    await conn.rollback();
    console.error('[PUT /orders/:id/cancel]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// ─── POST /api/orders/:orderId/shipment ─────────────────────────────────────
// Seller submits shipment proof (courier, tracking, image).
router.post('/:orderId/shipment', verifyToken, uploadShipmentProof.single('shipping_proof_image'), ShipmentController.submitShipment);

// ─── GET /api/orders/:orderId/shipment ──────────────────────────────────────
// Buyer / seller / admin retrieves shipment info.
router.get('/:orderId/shipment', verifyToken, ShipmentController.getShipment);

// ─── POST /api/orders/:orderId/confirm-received ──────────────────────────────
// Buyer confirms item received → escrow released to seller → order completed.
router.post('/:orderId/confirm-received', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const buyerId = req.user.id;
  const OrderFlowService = require('../services/OrderFlowService');
  try {
    const result = await OrderFlowService.confirmOrderReceived(orderId, buyerId);
    res.json({
      success: true,
      message: 'Penerimaan dikonfirmasi. Dana telah dicairkan ke penjual.',
      data: { order_id: orderId, escrows_released: result.escrowsReleased }
    });
  } catch (err) {
    console.error('[confirm-received]', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── POST /api/orders/:orderId/complaint ─────────────────────────────────────
// Buyer files a complaint for a shipped order.
router.post('/:orderId/complaint', verifyToken, ComplaintController.createComplaint);

// ─── GET /api/orders/:orderId/complaint ──────────────────────────────────────
// Get complaint details for an order.
router.get('/:orderId/complaint', verifyToken, ComplaintController.getComplaintByOrder);

// ─── POST /api/orders/:orderId/complaint/approve ─────────────────────────────
// Admin approves refund.
router.post('/:orderId/complaint/approve', verifyToken, ComplaintController.approveRefund);

// ─── POST /api/orders/:orderId/complaint/reject ──────────────────────────────
// Admin rejects complaint → releases fund to seller.
router.post('/:orderId/complaint/reject', verifyToken, ComplaintController.rejectComplaint);

// ─────────────────────────────────────────────────────────────────────────────
// CAMPUS COD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /api/orders/:orderId/cod/accept ────────────────────────────────────
// Seller accepts Campus COD order -> generates handover code
router.post('/:orderId/cod/accept', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const sellerId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    if (order.fulfillment_method !== 'campus_cod') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Order ini bukan Campus COD' });
    }

    if (order.status !== 'cod_pending') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Status saat ini ${order.status}, tidak bisa di-accept` });
    }

    const [sellerItems] = await conn.query('SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?', [orderId, sellerId]);
    if (sellerItems.length === 0) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Anda bukan penjual di order ini' });
    }

    // Generate random 6-digit code
    const handoverCode = Math.floor(100000 + Math.random() * 900000).toString();

    await conn.query(
      `UPDATE orders SET status = 'cod_accepted', handover_code = ? WHERE id = ?`,
      [handoverCode, orderId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Order Campus COD diterima. Kode serah terima telah di-generate.' });
  } catch (err) {
    await conn.rollback();
    console.error('[cod/accept]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// ─── POST /api/orders/:orderId/cod/complete ──────────────────────────────────
// Seller enters handover code to complete the COD order
router.post('/:orderId/cod/complete', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const sellerId = req.user.id;
  const { handover_code } = req.body;

  if (!handover_code) {
    return res.status(400).json({ success: false, message: 'Kode serah terima wajib diisi' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    if (order.status !== 'cod_accepted') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Status saat ini ${order.status}, tidak bisa diselesaikan` });
    }

    const [sellerItems] = await conn.query('SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?', [orderId, sellerId]);
    if (sellerItems.length === 0) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Anda bukan penjual di order ini' });
    }

    if (order.handover_code !== handover_code.trim()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Kode serah terima tidak valid' });
    }

    await conn.query(
      `UPDATE orders SET status = 'cod_completed', payment_status = 'paid', delivery_status = 'delivered', handover_verified_at = NOW() WHERE id = ?`,
      [orderId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Transaksi Campus COD selesai!' });
  } catch (err) {
    await conn.rollback();
    console.error('[cod/complete]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// ─── POST /api/orders/:orderId/cod/cancel ────────────────────────────────────
// Buyer or Seller cancels the COD order if meetup fails
router.post('/:orderId/cod/cancel', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    if (order.fulfillment_method !== 'campus_cod') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Order ini bukan Campus COD' });
    }

    if (order.status !== 'cod_pending' && order.status !== 'cod_accepted') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Tidak bisa membatalkan order dengan status ${order.status}` });
    }

    let isAuthorized = false;
    if (isAdmin || order.buyer_id === userId) {
      isAuthorized = true;
    } else {
      const [sellerItems] = await conn.query('SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?', [orderId, userId]);
      if (sellerItems.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Restore stock
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      await conn.query('UPDATE books SET stock = stock + ? WHERE id = ?', [item.quantity, item.book_id]);
      await conn.query('UPDATE books SET is_available = TRUE WHERE id = ? AND stock > 0 AND is_approved = TRUE', [item.book_id]);
    }

    await conn.query(
      `UPDATE orders SET status = 'cod_cancelled', delivery_status = 'cancelled', payment_status = 'failed' WHERE id = ?`,
      [orderId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Order Campus COD dibatalkan dan stok dikembalikan.' });
  } catch (err) {
    await conn.rollback();
    console.error('[cod/cancel]', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
