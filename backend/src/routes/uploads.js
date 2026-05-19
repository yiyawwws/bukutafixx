const express = require('express');
const { verifyToken } = require('../middleware/auth');
const UploadController = require('../controllers/UploadController');

const router = express.Router();

/**
 * GET /api/uploads/ktms/:filename
 * Protected route — requires valid JWT. Only owner or admin can access.
 */
router.get('/ktms/:filename', verifyToken, UploadController.serveKtmFile);

module.exports = router;
