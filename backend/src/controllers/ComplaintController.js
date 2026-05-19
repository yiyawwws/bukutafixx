const pool = require('../config/database');
const OrderFlowService = require('../services/OrderFlowService');

class ComplaintController {

  /**
   * POST /api/orders/:orderId/complaint
   * Buyer files a complaint for a shipped order.
   * Body: { reason, evidence_image? }
   */
  static async createComplaint(req, res) {
    const orderId = parseInt(req.params.orderId);
    const buyerId = req.user.id;
    const { reason, evidence_image } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Alasan komplain wajib diisi' });
    }

    try {
      await OrderFlowService.createComplaint(orderId, buyerId, {
        reason: reason.trim(),
        evidence_image: evidence_image || null,
      });

      res.json({
        success: true,
        message: 'Komplain berhasil dikirim. Admin akan meninjau dalam 1×24 jam.',
      });
    } catch (err) {
      console.error('[ComplaintController.createComplaint]', err.message);
      res.status(400).json({ success: false, message: err.message || 'Gagal mengirim komplain' });
    }
  }

  /**
   * GET /api/complaints
   * Admin: list all complaints with order and buyer info.
   */
  static async getAllComplaints(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    try {
      const [complaints] = await pool.query(
        `SELECT
           c.*,
           u.name  AS buyer_name,
           u.email AS buyer_email,
           o.total_amount,
           o.status AS order_status,
           admin.name AS resolved_by_name
         FROM complaints c
         JOIN orders o ON c.order_id = o.id
         JOIN users  u ON c.buyer_id = u.id
         LEFT JOIN users admin ON c.resolved_by = admin.id
         ORDER BY c.created_at DESC`
      );
      res.json({ success: true, data: complaints });
    } catch (err) {
      console.error('[ComplaintController.getAllComplaints]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * GET /api/complaints/:orderId
   * Get complaint for a specific order (buyer or admin).
   */
  static async getComplaintByOrder(req, res) {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      if (userRole !== 'admin') {
        const [[order]] = await pool.query('SELECT buyer_id FROM orders WHERE id = ?', [orderId]);
        if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
        if (order.buyer_id !== userId) {
          return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }
      }

      const [[complaint]] = await pool.query(
        `SELECT c.*, u.name AS resolved_by_name
         FROM complaints c
         LEFT JOIN users u ON c.resolved_by = u.id
         WHERE c.order_id = ?
         ORDER BY c.created_at DESC LIMIT 1`,
        [orderId]
      );

      res.json({ success: true, data: complaint || null });
    } catch (err) {
      console.error('[ComplaintController.getComplaintByOrder]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * POST /api/orders/:orderId/complaint/approve
   * Admin approves refund for a complaint.
   */
  static async approveRefund(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const orderId = parseInt(req.params.orderId);
    const adminId = req.user.id;

    try {
      await OrderFlowService.approveRefund(orderId, adminId);
      res.json({
        success: true,
        message: 'Refund disetujui. Dana dikembalikan ke pembeli.',
      });
    } catch (err) {
      console.error('[ComplaintController.approveRefund]', err.message);
      res.status(400).json({ success: false, message: err.message || 'Gagal menyetujui refund' });
    }
  }

  /**
   * POST /api/orders/:orderId/complaint/reject
   * Admin rejects complaint → releases escrow to seller.
   * Body: { admin_note? }
   */
  static async rejectComplaint(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const orderId = parseInt(req.params.orderId);
    const adminId = req.user.id;
    const { admin_note } = req.body;

    try {
      await OrderFlowService.rejectComplaintAndReleaseFund(orderId, adminId, admin_note);
      res.json({
        success: true,
        message: 'Komplain ditolak. Dana dicairkan ke penjual.',
      });
    } catch (err) {
      console.error('[ComplaintController.rejectComplaint]', err.message);
      res.status(400).json({ success: false, message: err.message || 'Gagal menolak komplain' });
    }
  }
}

module.exports = ComplaintController;
