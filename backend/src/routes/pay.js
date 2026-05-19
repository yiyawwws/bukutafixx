const express = require('express');
const OrderController = require('../controllers/OrderController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/pay/methods ─────────────────────────────────
// Daftar metode pembayaran (publik)
router.get('/methods', OrderController.getPaymentMethods);

// ─── POST /api/pay/create ─────────────────────────────────
// Buyer mulai pembayaran untuk order yang sudah dibuat
// Body: { order_id, payment_method, redirect_url? }
router.post('/create', verifyToken, OrderController.createPayment);

// ─── GET /api/pay/status/:orderId ────────────────────────
// Cek & sync status pembayaran dari Pakasir
router.get('/status/:orderId', verifyToken, OrderController.checkPaymentStatus);

// ─── POST /api/pay/cancel/:orderId ───────────────────────
// Buyer cancel pembayaran yang pending
router.post('/cancel/:orderId', verifyToken, OrderController.cancelPayment);

// ─── POST /api/pay/simulate/:orderId ─────────────────────
// [DEVELOPMENT ONLY] Simulasi pembayaran berhasil
router.post('/simulate/:orderId', verifyToken, OrderController.simulatePayment);

module.exports = router;
