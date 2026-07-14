const pool = require('../config/database');
const OrderFlowService = require('../services/OrderFlowService');
const { saveFileToDB } = require('../utils/fileUpload');

class ShipmentController {

  /**
   * POST /api/orders/:orderId/shipment
   * Seller submits shipment proof.
   * Body: { courier_name, tracking_number?, shipping_proof_image?, shipping_note? }
   */
  static async submitShipment(req, res) {
    const orderId = parseInt(req.params.orderId);
    const sellerId = req.user.id;
    const { courier_name, tracking_number, shipping_note } = req.body;
    let shipping_proof_image = req.body.shipping_proof_image;

    if (req.file) {
      shipping_proof_image = await saveFileToDB(req.file);
    }

    if (!courier_name || !courier_name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama kurir wajib diisi' });
    }

    if (!tracking_number || !tracking_number.trim()) {
      return res.status(400).json({ success: false, message: 'Nomor resi wajib diisi' });
    }

    if (!shipping_proof_image) {
      return res.status(400).json({ success: false, message: 'Bukti pengiriman wajib diunggah' });
    }

    try {
      await OrderFlowService.submitShipment(orderId, sellerId, {
        courier_name: courier_name.trim(),
        tracking_number: tracking_number?.trim() || null,
        shipping_proof_image: shipping_proof_image || null,
        shipping_note: shipping_note?.trim() || null,
      });

      res.json({
        success: true,
        message: 'Bukti pengiriman berhasil dikirim. Status order diperbarui ke Dikirim.',
      });
    } catch (err) {
      console.error('[ShipmentController.submitShipment]', err.message);
      res.status(400).json({ success: false, message: err.message || 'Gagal mengirim bukti pengiriman' });
    }
  }

  /**
   * GET /api/orders/:orderId/shipment
   * Get shipment details for an order.
   * Accessible by: buyer of the order, seller in the order, admin.
   */
  static async getShipment(req, res) {
    const orderId = parseInt(req.params.orderId);
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      // Access check
      if (userRole !== 'admin') {
        const [[order]] = await pool.query('SELECT buyer_id FROM orders WHERE id = ?', [orderId]);
        if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

        if (order.buyer_id !== userId) {
          const [sellerItems] = await pool.query(
            'SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?',
            [orderId, userId]
          );
          if (sellerItems.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
          }
        }
      }

      const [[shipment]] = await pool.query(
        `SELECT s.*, u.name as seller_name
         FROM shipments s
         JOIN users u ON s.seller_id = u.id
         WHERE s.order_id = ?`,
        [orderId]
      );

      res.json({ success: true, data: shipment || null });
    } catch (err) {
      console.error('[ShipmentController.getShipment]', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = ShipmentController;
