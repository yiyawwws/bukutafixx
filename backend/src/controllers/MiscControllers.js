const pool = require('../config/database');
const { ChatModel, ReviewModel } = require('../models/MiscModels');
const { EscrowTransactionModel, SellerWalletModel } = require('../models/EscrowWalletModel');
const { saveFileToDB } = require('../utils/fileUpload');

// ─────────────────────────────────────────────────────────────
// ChatController
// ─────────────────────────────────────────────────────────────
class ChatController {
  /**
   * POST /api/chat/send
   * Simpan pesan ke tabel Chats.
   */
  static async sendMessage(req, res) {
    const { id_trans, pesan_teks } = req.body;
    const id_sender = req.user.id;

    if (!id_trans || !pesan_teks) {
      return res.status(400).json({ success: false, message: 'Transaction ID and message text are required' });
    }

    try {
      const chatId = await ChatModel.create({ id_trans, id_sender, pesan_teks });
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { id: chatId, id_trans, id_sender, pesan_teks }
      });
    } catch (err) {
      console.error('Send Message Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// ReviewController
// ─────────────────────────────────────────────────────────────
class ReviewController {
  /**
   * POST /api/review/add
   * Simpan rating ke tabel Reviews.
   */
  static async addReview(req, res) {
    const { id_trans, skor_bintang, komentar } = req.body;

    if (!id_trans || !skor_bintang) {
      return res.status(400).json({ success: false, message: 'Transaction ID and star score are required' });
    }

    try {
      const reviewId = await ReviewModel.create({ id_trans, skor_bintang, komentar });
      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: { id: reviewId, id_trans, skor_bintang, komentar }
      });
    } catch (err) {
      console.error('Add Review Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// DisputeController
// ─────────────────────────────────────────────────────────────
class DisputeController {
  /**
   * POST /api/dispute/report
   * Pembeli mengajukan komplain.
   * - Bekukan escrow (status → 'disputed')
   * - Simpan record di tabel disputes
   */
  static async reportDispute(req, res) {
    const { order_id, reason, description } = req.body;
    const buyerId = req.user.id;

    if (!order_id || !reason) {
      return res.status(400).json({ success: false, message: 'order_id dan reason wajib diisi' });
    }

    // ── Validate unboxing video ──────────────────────────────
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video unboxing wajib diunggah sebagai bukti komplain.' });
    }

    // Backend file-type guard (multer fileFilter already ran, but double-check)
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Hanya file video yang diizinkan (MP4, WEBM, MOV).' });
    }

    // URL lokal dari database files
    const unboxingVideoUrl = await saveFileToDB(req.file);

    // Combine reason + optional description into full reason string
    const fullReason = description
      ? `${reason}\n\nKeterangan: ${description}`
      : reason;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validasi: order milik buyer ini dan sudah paid
      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
        [order_id, buyerId]
      );
      if (!order) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan milik Anda' });
      }
      if (order.payment_status !== 'paid') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Tidak dapat komplain — pembayaran belum selesai' });
      }

      // Cari escrow yang masih 'held' untuk order ini
      const [escrows] = await connection.query(
        `SELECT * FROM escrow_transactions WHERE order_id = ? AND status = 'held'`,
        [order_id]
      );
      if (escrows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Tidak ada escrow aktif. Dana mungkin sudah dicairkan.' });
      }

      // Bekukan semua escrow untuk order ini
      let disputeIds = [];
      for (const escrow of escrows) {
        await EscrowTransactionModel.markDisputed(connection, escrow.id);

        // Simpan record dispute
        const [dispResult] = await connection.query(
          `INSERT INTO disputes (escrow_id, order_id, buyer_id, seller_id, reason, unboxing_video_url, status)
           VALUES (?, ?, ?, ?, ?, ?, 'open')`,
          [escrow.id, order_id, buyerId, escrow.seller_id, fullReason, unboxingVideoUrl]
        );
        disputeIds.push(dispResult.insertId);
      }

      // Update status order menjadi complaint
      await connection.query(
        `UPDATE orders SET status = 'complaint' WHERE id = ?`,
        [order_id]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Komplain berhasil diajukan. Dana ditahan sambil menunggu review admin.',
        data: { order_id: parseInt(order_id), dispute_ids: disputeIds, status: 'open' }
      });
    } catch (err) {
      await connection.rollback();
      console.error('ReportDispute Error:', err);
      res.status(500).json({ success: false, message: 'Server error', error: err.message, stack: err.stack });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/dispute/list
   * Admin melihat semua dispute aktif.
   */
  static async getDisputeList(req, res) {
    // Hanya admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses ini' });
    }
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let where = 'WHERE 1=1';
      const params = [];
      if (status) {
        where += ' AND d.status = ?';
        params.push(status);
      }

      const [rows] = await pool.query(
        `SELECT d.*,
                buyer.name  AS buyer_name,  buyer.email  AS buyer_email,
                seller.name AS seller_name, seller.email AS seller_email,
                o.total_amount, o.delivery_status,
                et.amount   AS escrow_amount, et.status AS escrow_status
         FROM disputes d
         JOIN users buyer  ON d.buyer_id  = buyer.id
         JOIN users seller ON d.seller_id = seller.id
         JOIN orders o     ON d.order_id  = o.id
         JOIN escrow_transactions et ON d.escrow_id = et.id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM disputes d ${where}`,
        params
      );

      res.json({ success: true, data: rows, total, page: parseInt(page) });
    } catch (err) {
      console.error('GetDisputeList Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * GET /api/dispute/:id
   * Detail satu dispute — bisa diakses oleh buyer, seller, atau admin yang terlibat.
   */
  static async getDisputeDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT d.*,
                buyer.name  AS buyer_name,
                seller.name AS seller_name,
                o.total_amount, o.delivery_status,
                et.amount AS escrow_amount, et.status AS escrow_status
         FROM disputes d
         JOIN users buyer  ON d.buyer_id  = buyer.id
         JOIN users seller ON d.seller_id = seller.id
         JOIN orders o     ON d.order_id  = o.id
         JOIN escrow_transactions et ON d.escrow_id = et.id
         WHERE d.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Dispute tidak ditemukan' });
      }

      const dispute = rows[0];
      const isAdmin   = req.user.role === 'admin';
      const isBuyer   = dispute.buyer_id  === userId;
      const isSeller  = dispute.seller_id === userId;

      if (!isAdmin && !isBuyer && !isSeller) {
        return res.status(403).json({ success: false, message: 'Akses ditolak' });
      }

      // Parse evidence_photos jika JSON string
      if (dispute.evidence_photos && typeof dispute.evidence_photos === 'string') {
        dispute.evidence_photos = JSON.parse(dispute.evidence_photos);
      }

      res.json({ success: true, data: dispute });
    } catch (err) {
      console.error('GetDisputeDetail Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * PUT /api/dispute/:id/resolve
   * Admin memutuskan hasil dispute:
   *   decision: 'refund'  → kembalikan dana ke pembeli, escrow → 'refunded'
   *   decision: 'release' → cairkan dana ke penjual, escrow → 'released'
   */
  static async resolveDispute(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat memutuskan dispute' });
    }

    const { id } = req.params;
    const { decision, admin_notes } = req.body;

    if (!decision || !['refund', 'release'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision harus "refund" atau "release"' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Ambil dispute
      const [[dispute]] = await connection.query(
        `SELECT d.*, et.amount AS escrow_amount
         FROM disputes d
         JOIN escrow_transactions et ON d.escrow_id = et.id
         WHERE d.id = ?`,
        [id]
      );

      if (!dispute) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Dispute tidak ditemukan' });
      }

      if (!['open', 'under_review'].includes(dispute.status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Dispute ini sudah diselesaikan sebelumnya' });
      }

      const escrowId  = dispute.escrow_id;
      const sellerId  = dispute.seller_id;
      const amount    = parseFloat(dispute.escrow_amount);
      const adminId   = req.user.id;

      let newDisputeStatus;
      let escrowResult;

      if (decision === 'release') {
        // Cairkan dana ke penjual
        escrowResult = await EscrowTransactionModel.release(connection, escrowId);
        await SellerWalletModel.createIfNotExists(connection, sellerId);
        await SellerWalletModel.credit(connection, sellerId, amount);
        newDisputeStatus = 'resolved_release';
      } else {
        // Kembalikan dana ke pembeli (refund) dengan memasukkannya ke dompet pembeli
        escrowResult = await EscrowTransactionModel.refund(connection, escrowId);
        const buyerId = dispute.buyer_id;
        await SellerWalletModel.createIfNotExists(connection, buyerId);
        await SellerWalletModel.credit(connection, buyerId, amount);
        newDisputeStatus = 'resolved_refund';
      }

      if (!escrowResult) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Gagal memproses escrow. Status mungkin sudah berubah.' });
      }

      // Update status dispute
      await connection.query(
        `UPDATE disputes
         SET status = ?, admin_notes = ?, resolved_by = ?, resolved_at = NOW()
         WHERE id = ?`,
        [newDisputeStatus, admin_notes || null, adminId, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: decision === 'release'
          ? 'Dana berhasil dicairkan ke wallet penjual.'
          : 'Dana berhasil dikembalikan (refund) ke Saldo pembeli.',
        data: { dispute_id: parseInt(id), decision, new_status: newDisputeStatus }
      });
    } catch (err) {
      await connection.rollback();
      console.error('ResolveDispute Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      connection.release();
    }
  }

  /**
   * PATCH /api/dispute/:id/review
   * Admin menandai dispute sebagai 'under_review'.
   */
  static async markUnderReview(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin' });
    }
    try {
      const { id } = req.params;
      await pool.query(
        `UPDATE disputes SET status = 'under_review' WHERE id = ? AND status = 'open'`,
        [id]
      );
      res.json({ success: true, message: 'Dispute ditandai sedang direview' });
    } catch (err) {
      console.error('MarkUnderReview Error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = { ChatController, ReviewController, DisputeController };
