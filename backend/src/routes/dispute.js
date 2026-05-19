const express = require('express');
const { DisputeController } = require('../controllers/MiscControllers');
const { verifyToken } = require('../middleware/auth');
const uploadDisputeVideo = require('../middleware/uploadDisputeVideo');

const router = express.Router();

// ─── POST /api/dispute/report ─────────────────────────────
// Pembeli ajukan komplain + bekukan escrow
// unboxing_video field is optional at multer level; controller enforces requirement
router.post('/report', verifyToken, uploadDisputeVideo.single('unboxing_video'), DisputeController.reportDispute);

// ─── GET /api/dispute/list ────────────────────────────────
// Admin melihat semua dispute (dengan filter ?status=open)
router.get('/list', verifyToken, DisputeController.getDisputeList);

// ─── GET /api/dispute/:id ─────────────────────────────────
// Detail satu dispute (buyer, seller, atau admin)
router.get('/:id', verifyToken, DisputeController.getDisputeDetail);

// ─── PATCH /api/dispute/:id/review ───────────────────────
// Admin tandai dispute sedang direview
router.patch('/:id/review', verifyToken, DisputeController.markUnderReview);

// ─── PUT /api/dispute/:id/resolve ────────────────────────
// Admin putuskan hasil: { decision: 'refund' | 'release', admin_notes }
router.put('/:id/resolve', verifyToken, DisputeController.resolveDispute);

module.exports = router;
