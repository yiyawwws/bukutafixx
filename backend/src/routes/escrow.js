const express = require('express');
const EscrowController = require('../controllers/EscrowController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/escrow/my ───────────────────────────────────
// Buyer atau seller melihat daftar escrow miliknya
router.get('/my', verifyToken, EscrowController.getMyEscrow);

// ─── GET /api/escrow/wallet ───────────────────────────────
// Seller melihat saldo wallet-nya
router.get('/wallet', verifyToken, EscrowController.getWalletBalance);

// ─── GET /api/escrow/status/:orderId ─────────────────────
// Cek status escrow untuk satu order tertentu
router.get('/status/:orderId', verifyToken, EscrowController.getEscrowStatus);

// ─── POST /api/escrow/confirm/:orderId ───────────────────
// Pembeli konfirmasi buku sudah diterima → dana cair ke penjual
router.post('/confirm/:orderId', verifyToken, EscrowController.confirmReceived);

module.exports = router;
