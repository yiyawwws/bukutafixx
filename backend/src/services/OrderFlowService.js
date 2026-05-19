const pool = require('../config/database');
const { EscrowTransactionModel, SellerWalletModel } = require('../models/EscrowWalletModel');

// ─── Valid State Transitions ──────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  pending_payment:          ['paid_escrow', 'cancelled'],
  paid_escrow:              ['waiting_seller_shipment', 'refunded'],
  waiting_seller_shipment:  ['shipped', 'refunded'],
  shipped:                  ['received', 'complaint'],
  received:                 ['completed'],
  complaint:                ['refunded', 'completed'],
  completed:                [],
  refunded:                 [],
  cancelled:                [],
  cod_pending:              ['cod_accepted', 'cod_cancelled'],
  cod_accepted:             ['cod_completed', 'cod_cancelled', 'cod_failed'],
  cod_completed:            [],
  cod_cancelled:            [],
  cod_failed:               [],
};

class OrderFlowService {

  /**
   * Validate that a status transition is legal.
   * Throws an Error if invalid.
   */
  static validateTransition(current, next) {
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed) throw new Error(`Status tidak dikenal: ${current}`);
    if (!allowed.includes(next)) {
      throw new Error(
        `Tidak bisa mengubah status dari '${current}' ke '${next}'. Status tidak valid.`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. handlePaymentSuccess
  //    Called after Pakasir confirms payment.
  //    Transitions: pending_payment → waiting_seller_shipment
  //    Escrow: set to 'held'  (escrow was created at checkout with status 'held',
  //            so we just verify it exists)
  // ─────────────────────────────────────────────────────────────────────────
  static async handlePaymentSuccess(orderId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');

      // Idempotent guard: already processed
      if (
        order.status === 'waiting_seller_shipment' ||
        order.status === 'shipped' ||
        order.status === 'received' ||
        order.status === 'completed'
      ) {
        await connection.rollback();
        return { alreadyProcessed: true };
      }

      // Guard duplicate escrow creation: escrow already exists with 'held'
      const [[existingEscrow]] = await connection.query(
        `SELECT id FROM escrow_transactions WHERE order_id = ? AND status = 'held' LIMIT 1`,
        [orderId]
      );
      // If escrow doesn't exist yet, create it now (safety net)
      if (!existingEscrow) {
        const [items] = await connection.query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [orderId]
        );
        const sellerAmounts = {};
        for (const item of items) {
          sellerAmounts[item.seller_id] = (sellerAmounts[item.seller_id] || 0) +
            parseFloat(item.price_at_purchase) * item.quantity;
        }
        for (const [sellerId, amount] of Object.entries(sellerAmounts)) {
          await SellerWalletModel.createIfNotExists(connection, parseInt(sellerId));
          await EscrowTransactionModel.create({
            orderId,
            sellerId: parseInt(sellerId),
            buyerId: order.buyer_id,
            amount,
            autoReleaseDays: 3,
          }, connection);
        }
      }

      // Update order: use new unified status + keep legacy columns in sync
      await connection.query(
        `UPDATE orders
         SET status = 'waiting_seller_shipment',
             payment_status = 'paid',
             delivery_status = 'processing'
         WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Payment success for order ${orderId} → waiting_seller_shipment`);
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. submitShipment
  //    Seller submits courier + tracking proof.
  //    Transitions: waiting_seller_shipment → shipped
  // ─────────────────────────────────────────────────────────────────────────
  static async submitShipment(orderId, sellerId, payload) {
    const { courier_name, tracking_number, shipping_proof_image, shipping_note } = payload;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');

      // Verify seller belongs to this order
      const [sellerItems] = await connection.query(
        'SELECT id FROM order_items WHERE order_id = ? AND seller_id = ?',
        [orderId, sellerId]
      );
      if (sellerItems.length === 0) {
        throw new Error('Anda bukan penjual di order ini');
      }

      this.validateTransition(order.status, 'shipped');

      // Insert shipment record
      await connection.query(
        `INSERT INTO shipments
           (order_id, seller_id, courier_name, tracking_number, shipping_proof_image, shipping_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, sellerId, courier_name, tracking_number || null, shipping_proof_image || null, shipping_note || null]
      );

      // Update order status + legacy column
      await connection.query(
        `UPDATE orders SET status = 'shipped', delivery_status = 'shipped' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Shipment submitted for order ${orderId} → shipped`);
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. confirmOrderReceived
  //    Buyer confirms item received → releases escrow to seller.
  //    Transitions: shipped → completed
  // ─────────────────────────────────────────────────────────────────────────
  static async confirmOrderReceived(orderId, buyerId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');
      if (order.buyer_id !== buyerId) throw new Error('Bukan order Anda');

      this.validateTransition(order.status, 'received');

      // Release escrow → seller wallet
      const released = await this._releaseEscrowToSeller(connection, orderId);

      // Update order status
      await connection.query(
        `UPDATE orders SET status = 'completed', delivery_status = 'delivered' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Order ${orderId} confirmed received → completed (${released} escrows released)`);
      return { success: true, escrowsReleased: released };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. createComplaint
  //    Buyer files a complaint for a shipped order → freezes escrow.
  //    Transitions: shipped → complaint
  // ─────────────────────────────────────────────────────────────────────────
  static async createComplaint(orderId, buyerId, { reason, evidence_image }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');
      if (order.buyer_id !== buyerId) throw new Error('Bukan order Anda');

      this.validateTransition(order.status, 'complaint');

      // Idempotent: no duplicate pending complaint
      const [[existing]] = await connection.query(
        `SELECT id FROM complaints WHERE order_id = ? AND status = 'pending'`,
        [orderId]
      );
      if (existing) throw new Error('Sudah ada komplain aktif untuk order ini');

      // Create complaint record
      await connection.query(
        `INSERT INTO complaints (order_id, buyer_id, reason, evidence_image) VALUES (?, ?, ?, ?)`,
        [orderId, buyerId, reason, evidence_image || null]
      );

      // Mark escrow as disputed (freeze)
      await connection.query(
        `UPDATE escrow_transactions SET status = 'disputed' WHERE order_id = ? AND status = 'held'`,
        [orderId]
      );

      // Update order status
      await connection.query(
        `UPDATE orders SET status = 'complaint' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Complaint created for order ${orderId} → complaint`);
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. approveRefund  (Admin)
  //    Admin approves complaint → refunds buyer.
  //    Transitions: complaint → refunded
  // ─────────────────────────────────────────────────────────────────────────
  static async approveRefund(orderId, adminId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');
      if (order.status !== 'complaint') {
        throw new Error(`Order tidak dalam status komplain (status saat ini: ${order.status})`);
      }

      // Resolve complaint record
      await connection.query(
        `UPDATE complaints
         SET status = 'approved_refund', resolved_by = ?, resolved_at = NOW()
         WHERE order_id = ? AND status = 'pending'`,
        [adminId, orderId]
      );

      // Mark escrow as refunded
      await connection.query(
        `UPDATE escrow_transactions
         SET status = 'refunded', refunded_at = NOW(), updated_at = NOW()
         WHERE order_id = ? AND status = 'disputed'`,
        [orderId]
      );

      // Update order status
      await connection.query(
        `UPDATE orders SET status = 'refunded', payment_status = 'failed' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Refund approved for order ${orderId} → refunded`);
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. rejectComplaintAndReleaseFund  (Admin)
  //    Admin rejects complaint → releases escrow to seller.
  //    Transitions: complaint → completed
  // ─────────────────────────────────────────────────────────────────────────
  static async rejectComplaintAndReleaseFund(orderId, adminId, adminNote) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (!order) throw new Error('Order tidak ditemukan');
      if (order.status !== 'complaint') {
        throw new Error(`Order tidak dalam status komplain (status saat ini: ${order.status})`);
      }

      // Resolve complaint record
      await connection.query(
        `UPDATE complaints
         SET status = 'rejected', admin_note = ?, resolved_by = ?, resolved_at = NOW()
         WHERE order_id = ? AND status = 'pending'`,
        [adminNote || null, adminId, orderId]
      );

      // Restore escrow to 'held' so release works
      await connection.query(
        `UPDATE escrow_transactions SET status = 'held' WHERE order_id = ? AND status = 'disputed'`,
        [orderId]
      );

      // Release escrow to seller
      await this._releaseEscrowToSeller(connection, orderId);

      // Update order to completed
      await connection.query(
        `UPDATE orders SET status = 'completed', delivery_status = 'delivered' WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      console.log(`[OrderFlow] Complaint rejected for order ${orderId} → completed, escrow released to seller`);
      return { success: true };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: release all 'held' escrows for an order → credit seller wallets
  // ─────────────────────────────────────────────────────────────────────────
  static async _releaseEscrowToSeller(connection, orderId) {
    const [escrows] = await connection.query(
      `SELECT * FROM escrow_transactions WHERE order_id = ? AND status = 'held'`,
      [orderId]
    );
    for (const escrow of escrows) {
      await EscrowTransactionModel.release(connection, escrow.id);
      await SellerWalletModel.createIfNotExists(connection, escrow.seller_id);
      await SellerWalletModel.credit(connection, escrow.seller_id, escrow.amount);
    }
    return escrows.length;
  }
}

module.exports = OrderFlowService;
