const express = require('express');
const ReviewController = require('../controllers/ReviewController');
const { verifyToken } = require('../middleware/auth');
const { requireActiveRole } = require('../middleware/role');

const router = express.Router();

// ─── POST /api/reviews/order/:orderId ───────────────────────
// Buyer submit rating & review for an order
router.post('/order/:orderId', verifyToken, ReviewController.submitReview);

// ─── GET /api/reviews/order/:orderId ────────────────────────
// Get rating & review for an order
router.get('/order/:orderId', verifyToken, ReviewController.getOrderReview);

// ─── GET /api/reviews/seller ──────────────────────────────
// Get all ratings & reviews for a seller (seller dashboard)
router.get('/seller', verifyToken, requireActiveRole('seller'), ReviewController.getSellerReviews);

module.exports = router;
