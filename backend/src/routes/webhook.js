const express = require('express');
const router = express.Router();

// Route webhook dinonaktifkan — pembayaran menggunakan sistem manual.
// Jika menggunakan payment gateway (Pakasir/dll), tambahkan webhook handler di sini.
// Contoh: router.post('/payment', PaymentGatewayController.handleWebhook);

module.exports = router;
